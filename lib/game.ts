import { createHash, randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { teamRanking, type TeamRank } from "@/lib/game-teams";
import { isLive } from "@/lib/game-window";
import { easternWallToUtcIso } from "@/lib/format";

// Lobby game: one session per performance, open its whole Eastern show day
// (midnight to 11:59pm), paused from curtain until 90 minutes after (see
// lib/game-window.ts). Sessions are created lazily from showtimes, so nothing
// has to run on a schedule. All writes go through the service role; the public
// reads sessions and the leaderboard directly (RLS hides admin-hidden names).

/** Midnight to 11:59pm Eastern on the curtain's Eastern date. */
function showDay(curtainIso: string) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(curtainIso));
  return { opens: Date.parse(easternWallToUtcIso(`${day}T00:00`)), closes: Date.parse(easternWallToUtcIso(`${day}T23:59`)) };
}
export const REHEARSAL_MS = 30 * 60 * 1000;

export type GameSession = {
  id: string;
  production_id: string;
  showtime_id: string | null;
  is_rehearsal: boolean;
  label: string | null;
  opens_at: string;
  closes_at: string;
  curtain_at: string | null;
};

export type BoardPlayer = {
  id: string;
  session_id: string;
  name: string;
  score: number;
  finished_at: string | null;
  created_at: string;
  team_id?: string | null;
};

export type Night = {
  session_id: string;
  label: string;
  opens_at: string;
  players: number;
  top: number;
  avg: number;
};

export type Board = {
  tonight: BoardPlayer[]; // the live (or most recent) session
  all: (BoardPlayer & { night: string })[]; // every real session of the production
  nights: Night[];
  teams: TeamRank[]; // tonight's teams, ranked
  teamsAll: TeamRank[]; // every night, ranked
};

export type PlayState = {
  production: { id: string; slug: string; title: string; accent: string | null } | null;
  /** Live right now (performance or rehearsal). */
  live: GameSession | null;
  /** The session the "Tonight" tab shows: live, else the most recent real one. */
  current: GameSession | null;
  /** Next performance window that hasn't opened yet. */
  next: { opens_at: string; closes_at: string; title: string; label: string | null } | null;
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/**
 * Work out what /play should show right now, creating the performance session
 * row if we're inside a window and nobody has opened it yet.
 */
export async function getPlayState(now = Date.now()): Promise<PlayState> {
  const db = createAdminClient();
  const empty: PlayState = { production: null, live: null, current: null, next: null };
  if (!db) return empty;

  // Performance showtimes of game-enabled shows that haven't started yet,
  // plus any that started in the last minute (window just closed).
  const { data: shows } = await db
    .from("showtimes")
    .select("id, starts_at, label, production:productions!inner(id, slug, title, accent, has_game)")
    .eq("is_performance", true)
    .eq("productions.has_game", true)
    .not("starts_at", "is", null)
    .gt("starts_at", new Date(now - 24 * 60 * 60 * 1000).toISOString())
    .order("starts_at", { ascending: true })
    .limit(3);

  type Prod = NonNullable<PlayState["production"]>;
  const upcoming = (shows ?? []) as unknown as {
    id: string;
    starts_at: string;
    label: string | null;
    production: Prod;
  }[];

  let live: GameSession | null = null;
  let liveProd: Prod | null = null;
  let next: PlayState["next"] = null;
  let stopped: { session: GameSession; production: Prod } | null = null;

  for (const st of upcoming) {
    const { opens, closes } = showDay(st.starts_at);
    if (closes <= now) continue; // that show day is over
    if (opens <= now && !live) {
      const s = await ensureSession(st.production.id, st.id, st.label, opens, closes, st.starts_at);
      // Paused for the show, or an admin stopped it early: the row exists but isn't live.
      if (s && isLive(s, now)) {
        live = s;
        liveProd = st.production;
      } else if (s) {
        stopped = { session: s, production: st.production };
      }
    } else if (opens > now && !next) {
      next = {
        opens_at: new Date(opens).toISOString(),
        closes_at: new Date(closes).toISOString(),
        title: st.production.title,
        label: st.label,
      };
    }
  }

  // A live rehearsal takes over the page when no performance is live.
  if (!live) {
    const { data: reh } = await db
      .from("game_sessions")
      .select("*, production:productions(id, slug, title, accent)")
      .eq("is_rehearsal", true)
      .lte("opens_at", new Date(now).toISOString())
      .gt("closes_at", new Date(now).toISOString())
      .order("opens_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (reh) {
      const { production, ...s } = reh as GameSession & { production: Prod };
      live = s;
      liveProd = production;
    }
  }

  if (live) return { production: liveProd, live, current: live, next };
  if (stopped) return { production: stopped.production, live: null, current: stopped.session, next };

  // Nothing live: show the most recent session's production (its final
  // results stay up until the next show's window opens). A rehearsal counts
  // only for an hour after it closes, so testers see their curtain screen.
  const { data: last } = await db
    .from("game_sessions")
    .select("*, production:productions(id, slug, title, accent)")
    .lte("opens_at", new Date(now).toISOString())
    .or(`is_rehearsal.eq.false,closes_at.gt.${new Date(now - 60 * 60 * 1000).toISOString()}`)
    .order("opens_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last) {
    const { production, ...s } = last as GameSession & { production: Prod };
    return { production, live: null, current: s, next };
  }
  return { production: upcoming[0]?.production ?? null, live: null, current: null, next };
}

async function ensureSession(
  productionId: string,
  showtimeId: string,
  label: string | null,
  opens: number,
  closes: number,
  curtainIso: string,
): Promise<GameSession | null> {
  const db = createAdminClient()!;
  // Insert-or-keep on the unique showtime_id so two first visitors can't make
  // two sessions, and so an admin's manual stop (closes_at = now) sticks.
  // ponytail: a showtime moved after its session exists keeps the old window.
  await db
    .from("game_sessions")
    .upsert(
      {
        production_id: productionId,
        showtime_id: showtimeId,
        label,
        opens_at: new Date(opens).toISOString(),
        closes_at: new Date(closes).toISOString(),
        curtain_at: curtainIso,
      },
      { onConflict: "showtime_id", ignoreDuplicates: true },
    );
  const { data } = await db.from("game_sessions").select("*").eq("showtime_id", showtimeId).maybeSingle();
  return (data as GameSession) ?? null;
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------
const rank = (a: BoardPlayer, b: BoardPlayer) =>
  b.score - a.score ||
  (a.finished_at ?? "9999").localeCompare(b.finished_at ?? "9999") ||
  a.created_at.localeCompare(b.created_at);

export const EMPTY_BOARD: Board = { tonight: [], all: [], nights: [], teams: [], teamsAll: [] };

/** Tonight + whole-run board for a production. Hidden names are excluded by RLS-equivalent filter. */
export async function getBoard(productionId: string, currentSessionId: string | null): Promise<Board> {
  const db = createAdminClient();
  if (!db) return EMPTY_BOARD;

  const { data: sessions } = await db
    .from("game_sessions")
    .select("id, label, opens_at, is_rehearsal")
    .eq("production_id", productionId)
    .order("opens_at", { ascending: true });
  // Rehearsals never count — except the live one, so its own Tonight tab works.
  const ids = (sessions ?? [])
    .filter((s) => !s.is_rehearsal || s.id === currentSessionId)
    .map((s) => s.id);
  if (!ids.length) return EMPTY_BOARD;

  const { data: players } = await db
    .from("game_players")
    .select("id, session_id, name, score, finished_at, created_at")
    .in("session_id", ids)
    .eq("hidden", false);
  const ps = ((players ?? []) as BoardPlayer[]).sort(rank);
  const teams = await teamRanking(ids);

  // "All nights" = real performances, plus the live rehearsal while testing.
  const real = (sessions ?? []).filter((s) => !s.is_rehearsal || s.id === currentSessionId);
  const labelOf = new Map(real.map((s) => [s.id, s.label ?? new Date(s.opens_at).toLocaleDateString("en-US", { weekday: "short", timeZone: "America/New_York" })]));

  return {
    teams: teams.filter((t) => t.session_id === currentSessionId),
    teamsAll: teams.filter((t) => labelOf.has(t.session_id)).map((t) => ({ ...t, night: labelOf.get(t.session_id)! })),
    tonight: ps.filter((p) => p.session_id === currentSessionId),
    all: ps.filter((p) => labelOf.has(p.session_id)).map((p) => ({ ...p, night: labelOf.get(p.session_id)! })),
    nights: real.map((s) => {
      const mine = ps.filter((p) => p.session_id === s.id);
      return {
        session_id: s.id,
        label: labelOf.get(s.id)!,
        opens_at: s.opens_at,
        players: mine.length,
        top: mine[0]?.score ?? 0,
        avg: mine.length ? Math.round(mine.reduce((n, p) => n + p.score, 0) / mine.length) : 0,
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------
export const tokenCookie = (sessionId: string) => `gp_${sessionId.replace(/-/g, "")}`;
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

/** Clean a typed name: collapse whitespace, strip control chars, cap length. */
export function cleanName(raw: string) {
  return raw.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, 24);
}

export async function getSession(id: string): Promise<GameSession | null> {
  const db = createAdminClient();
  if (!db) return null;
  const { data } = await db.from("game_sessions").select("*").eq("id", id).maybeSingle();
  return (data as GameSession) ?? null;
}

export async function playerForToken(sessionId: string, token: string | undefined) {
  if (!token) return null;
  const db = createAdminClient()!;
  const { data } = await db
    .from("game_player_tokens")
    .select("player:game_players!inner(id, session_id, name, score, finished_at, team_id)")
    .eq("token_hash", hash(token))
    .maybeSingle();
  const p = (data as unknown as { player: BoardPlayer } | null)?.player;
  return p && p.session_id === sessionId ? p : null;
}

/**
 * Register a name in a live session. An exact name already in play is
 * reported back (so the phone can ask "is that you?") unless `forceNew`, in
 * which case duplicates get " #2", " #3", …
 */
export async function joinSession(sessionId: string, rawName: string, forceNew = false, now = Date.now()) {
  const name = cleanName(rawName);
  if (!name) return { error: "Enter a name." } as const;
  const session = await getSession(sessionId);
  if (!session || !isLive(session, now)) return { error: "This game isn't open right now." } as const;

  const db = createAdminClient()!;
  if (!forceNew) {
    const { data: existing } = await db
      .from("game_players")
      .select("id, name, score, team:game_teams(name)")
      .eq("session_id", sessionId)
      .eq("name", name)
      .maybeSingle();
    if (existing) {
      const e = existing as unknown as { id: string; name: string; score: number; team: { name: string } | null };
      return { exists: { id: e.id, name: e.name, score: e.score, team: e.team?.name ?? null } } as const;
    }
  }
  for (let n = 1; n <= 50; n++) {
    const candidate = n === 1 ? name : `${name} #${n}`;
    const { data, error } = await db
      .from("game_players")
      .insert({ session_id: sessionId, name: candidate })
      .select("id, session_id, name, score, finished_at, team_id")
      .single();
    if (error?.code === "23505") continue; // name taken in this session
    if (error || !data) return { error: "Couldn't join. Try again." } as const;
    const token = randomUUID();
    await db.from("game_player_tokens").insert({ player_id: data.id, token_hash: hash(token) });
    return { player: data as BoardPlayer, token } as const;
  }
  return { error: "That name is very popular tonight. Try another." } as const;
}

/**
 * Re-issue the token for an existing player (phone lost its cookie). Bragging
 * rights only, so a name is enough to reclaim; the old device is signed out.
 */
export async function claimPlayer(sessionId: string, playerId: string, now = Date.now()) {
  const session = await getSession(sessionId);
  if (!session || !isLive(session, now)) return { error: "This game isn't open right now." } as const;
  const db = createAdminClient()!;
  const { data: p } = await db.from("game_players").select("id").eq("id", playerId).eq("session_id", sessionId).maybeSingle();
  if (!p) return { error: "That player is gone." } as const;
  const token = randomUUID();
  await db.from("game_player_tokens").upsert({ player_id: playerId, token_hash: hash(token) }, { onConflict: "player_id" });
  return { token } as const;
}

export async function startRehearsal(productionId: string, now = Date.now(), ms = REHEARSAL_MS) {
  const db = createAdminClient()!;
  // One live rehearsal at a time: two admins (or two phones) tapping Start
  // within seconds must not split the room into two sessions.
  const { data: open } = await db
    .from("game_sessions")
    .select("id")
    .eq("production_id", productionId)
    .eq("is_rehearsal", true)
    .gt("closes_at", new Date(now).toISOString())
    .limit(1);
  if (open?.length) return { error: null };
  return db.from("game_sessions").insert({
    production_id: productionId,
    is_rehearsal: true,
    label: "Rehearsal",
    opens_at: new Date(now).toISOString(),
    closes_at: new Date(now + ms).toISOString(),
  });
}

/** Close a session now. Phones see the curtain screen within a second. */
export async function stopSession(id: string, now = Date.now()) {
  const db = createAdminClient()!;
  return db.from("game_sessions").update({ closes_at: new Date(now).toISOString() }).eq("id", id);
}
