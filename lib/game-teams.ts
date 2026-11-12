import { createAdminClient } from "@/lib/supabase/admin";
import {
  BONUS_POINTS,
  RACK_SIZE,
  SOLVE_POINTS,
  VALUE,
  WORD_POINTS,
  cellsOf,
  bonusCellKey,
  bonusLetter,
  draw,
  freshBag,
  givens,
  isBonusCell,
  publicPuzzle,
  puzzle as puzzleByKey,
  puzzlesFor,
  solution,
  type PublicPuzzle,
} from "@/lib/puzzles";

// Teams of up to 4 share one crossword board. Every mutation re-reads the
// board and writes it back guarded by `version` (optimistic concurrency), so
// two phones placing tiles at once can't lose a letter.

export const TEAM_SIZE = 4;
const CELEBRATE_MS = 6000;
/** After this long on one player's turn, any teammate may skip them. */
export const TURN_MS = 30_000;

export type Team = {
  id: string;
  session_id: string;
  name: string;
  is_open: boolean;
  started_at: string | null;
  solved: number;
  play_ms: number;
  created_at: string;
};
export type BoardRow = {
  id: string;
  team_id: string;
  puzzle_key: string;
  bag: string;
  placed: Record<string, { l: string; p: string | null }>;
  bonus: Record<string, string>;
  version: number;
  started_at: string;
  solved_at: string | null;
  turn: string | null; // player whose move it is
  turn_at: string | null;
};
export type TeamMember = { id: string; name: string; score: number; rack: string; created_at: string };

export type TeamRank = {
  id: string;
  name: string;
  solved: number;
  play_ms: number;
  members: number;
  started: boolean;
  night?: string;
};

/** Everything the phone needs to draw the team screen. */
export type TeamState = {
  team: Team;
  members: TeamMember[]; // join order (stable colours)
  board: (Omit<BoardRow, "bag"> & { puzzle: PublicPuzzle; bag_left: number }) | null;
  /** The just-solved board, for the celebration, while the next one is fresh. */
  justSolved: { puzzle_key: string; solved_at: string } | null;
  rank: { pos: number; of: number } | null;
  allDone: boolean;
};

const NAMES = [
  "West Egg", "East Egg", "The Plaza", "Valley of Ashes", "Gatsby's Garden", "The Green Light",
  "Wilson's Garage", "Daisy's Dock", "The Yellow Car", "Long Island Sound", "The Blue Lawn",
  "Old Sports", "The Flappers", "Jazz Babies", "The Buchanans", "The Carraways", "Owl Eyes",
  "The Library", "The Fountain", "The Ballroom",
];

const db = () => createAdminClient()!;

export const cleanTeamName = (raw: string) =>
  raw.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, 20);

async function freeName(sessionId: string) {
  const { data } = await db().from("game_teams").select("name").eq("session_id", sessionId);
  const taken = new Set((data ?? []).map((t) => t.name));
  for (let round = 0; round < 20; round++)
    for (const n of NAMES) {
      const name = round ? `${n} ${round + 1}` : n;
      if (!taken.has(name)) return name;
    }
  return `Team ${Math.floor(Math.random() * 10000)}`;
}

// ---------------------------------------------------------------------------
// Joining a team
// ---------------------------------------------------------------------------
export async function openTeams(sessionId: string) {
  const { data } = await db()
    .from("game_teams")
    .select("id, name, is_open, started_at, game_players(id)")
    .eq("session_id", sessionId)
    .eq("is_open", false)
    .order("created_at", { ascending: false });
  return ((data ?? []) as unknown as (Team & { game_players: { id: string }[] })[])
    .map((t) => ({ id: t.id, name: t.name, size: t.game_players.length, started: !!t.started_at }))
    .filter((t) => t.size < TEAM_SIZE);
}

export async function createTeam(sessionId: string, playerId: string, slug: string) {
  const { data: team, error } = await db()
    .from("game_teams")
    .insert({ session_id: sessionId, name: await freeName(sessionId), is_open: false })
    .select()
    .single();
  if (error || !team) return { error: "Couldn't create a team. Try again." } as const;
  return joinTeam(team.id, playerId, slug);
}

/** Put a player on a specific team (friends' team or auto-fill). Starts the team when it fills. */
export async function joinTeam(teamId: string, playerId: string, slug: string) {
  const d = db();
  const { data: team } = await d.from("game_teams").select("*").eq("id", teamId).maybeSingle();
  if (!team) return { error: "That team is gone." } as const;
  const { count } = await d.from("game_players").select("id", { count: "exact", head: true }).eq("team_id", teamId);
  if ((count ?? 0) >= TEAM_SIZE) return { error: "That team is full." } as const;
  // Switching teams is only allowed while your current one is still waiting.
  const { data: me } = await d.from("game_players").select("team:game_teams(started_at)").eq("id", playerId).single();
  const cur = (me as unknown as { team: { started_at: string | null } | null } | null)?.team;
  if (cur?.started_at) return { error: "Your team's game has already started." } as const;
  // ponytail: two phones joining the last seat at once can make a team of 5. Harmless.
  await d.from("game_players").update({ team_id: teamId }).eq("id", playerId);

  const t = team as Team;
  const size = (count ?? 0) + 1;
  if (t.started_at) {
    // Late joiner on a running board: deal a rack from the live bag.
    const board = await currentBoard(teamId);
    if (board) await dealRack(board, playerId);
  } else if (size >= TEAM_SIZE || (t.is_open && size >= 2)) {
    // Friends' teams wait for Start (or a full table); open teams go at two.
    await startTeam(teamId, slug);
  }
  return { teamId } as const;
}

/** Auto-placement: the oldest team with a free seat (waiting or playing, created or open), else a new open team. */
export async function autoTeam(sessionId: string, playerId: string, slug: string) {
  const d = db();
  const { data } = await d
    .from("game_teams")
    .select("id, game_players(id)")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(20);
  const seat = ((data ?? []) as unknown as { id: string; game_players: { id: string }[] }[]).find(
    (t) => t.game_players.length < TEAM_SIZE,
  );
  if (seat) return joinTeam(seat.id, playerId, slug);
  const { data: team, error } = await d
    .from("game_teams")
    .insert({ session_id: sessionId, name: await freeName(sessionId), is_open: true })
    .select()
    .single();
  if (error || !team) return { error: "Couldn't find you a team. Try again." } as const;
  return joinTeam(team.id, playerId, slug);
}

export async function renameTeam(teamId: string, raw: string) {
  const name = cleanTeamName(raw);
  if (!name) return { error: "Enter a name." } as const;
  const { error } = await db().from("game_teams").update({ name }).eq("id", teamId).is("started_at", null);
  if (error?.code === "23505") return { error: "Another team already has that name." } as const;
  if (error) return { error: "Couldn't rename." } as const;
  return { ok: true } as const;
}

// ---------------------------------------------------------------------------
// Boards
// ---------------------------------------------------------------------------
async function currentBoard(teamId: string): Promise<BoardRow | null> {
  const { data } = await db()
    .from("game_boards")
    .select("*")
    .eq("team_id", teamId)
    .is("solved_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as BoardRow) ?? null;
}

async function members(teamId: string): Promise<TeamMember[]> {
  const { data } = await db()
    .from("game_players")
    .select("id, name, score, rack, created_at")
    .eq("team_id", teamId)
    .eq("hidden", false)
    .order("created_at", { ascending: true });
  return (data ?? []) as TeamMember[];
}

/** Give one player a fresh rack from the board's bag (version-guarded). */
async function dealRack(board: BoardRow, playerId: string) {
  for (let i = 0; i < 3; i++) {
    const b = i ? await db().from("game_boards").select("*").eq("id", board.id).single().then((r) => r.data as BoardRow) : board;
    const { drawn, bag } = draw(b.bag, RACK_SIZE);
    const { data } = await db()
      .from("game_boards")
      .update({ bag, version: b.version + 1 })
      .eq("id", b.id)
      .eq("version", b.version)
      .select("id");
    if (data?.length) {
      await db().from("game_players").update({ rack: drawn }).eq("id", playerId);
      return;
    }
  }
}

/** Start the team's first board (idempotent) and deal everyone a rack. */
export async function startTeam(teamId: string, slug: string, now = Date.now()) {
  const d = db();
  const { data: started } = await d
    .from("game_teams")
    .update({ started_at: new Date(now).toISOString() })
    .eq("id", teamId)
    .is("started_at", null)
    .select("id");
  if (!started?.length) return { ok: true } as const; // someone else started it
  await nextBoard(teamId, slug);
  return { ok: true } as const;
}

/** Create the next unused puzzle for the team and deal racks. Returns null when all are done. */
async function nextBoard(teamId: string, slug: string) {
  const d = db();
  const { data: used } = await d.from("game_boards").select("puzzle_key").eq("team_id", teamId);
  const usedKeys = new Set((used ?? []).map((b) => b.puzzle_key));
  const p = puzzlesFor(slug).find((x) => !usedKeys.has(x.key));
  if (!p) return null;
  const ms = await members(teamId);
  let bag = freshBag(p);
  const racks = ms.map((m) => {
    const r = draw(bag, RACK_SIZE);
    bag = r.bag;
    return { id: m.id, rack: r.drawn };
  });
  const { data: board, error } = await d
    .from("game_boards")
    .insert({
      team_id: teamId,
      puzzle_key: p.key,
      bag,
      turn: ms[0]?.id ?? null,
      turn_at: new Date().toISOString(),
      // First letter of every word is given.
      placed: Object.fromEntries(Object.entries(givens(p)).map(([k, l]) => [k, { l, p: null }])),
    })
    .select()
    .single();
  if (error || !board) return null; // unique(team, puzzle) → a concurrent call already made it
  await Promise.all(racks.map((r) => d.from("game_players").update({ rack: r.rack }).eq("id", r.id)));
  return board as BoardRow;
}

type Mutate = (b: BoardRow, rack: string) => { board: Partial<BoardRow>; rack: string; points: number; key: string } | { error: string };

/** Read board + rack, apply `fn`, write back guarded by version; retry on a lost race. */
async function mutate(playerId: string, fn: Mutate, keepRack = false) {
  const d = db();
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: me } = await d.from("game_players").select("id, team_id, rack").eq("id", playerId).single();
    if (!me?.team_id) return { error: "You're not on a team." } as const;
    const board = await currentBoard(me.team_id);
    if (!board) return { error: "No board in play." } as const;
    if (board.turn && board.turn !== playerId) return { error: "Not your turn." } as const;
    const res = fn(board, me.rack);
    if ("error" in res) return res;
    const ms = await members(me.team_id);
    const { data } = await d
      .from("game_boards")
      .update({ ...res.board, ...nextTurn(ms, playerId), version: board.version + 1 })
      .eq("id", board.id)
      .eq("version", board.version)
      .select("id");
    if (!data?.length) continue; // lost the race, re-read and retry
    if (!keepRack) await d.from("game_players").update({ rack: res.rack }).eq("id", playerId);
    if (res.points) {
      await d.from("game_moves").insert({ player_id: playerId, item_key: `${board.id}:${res.key}`, points: res.points });
      await recomputeScore(playerId);
    }
    return { ok: true, board: { ...board, ...res.board } as BoardRow, teamId: me.team_id } as const;
  }
  return { error: "Busy board — try again." } as const;
}

/** Score = sum of the player's moves, so a retried write can't double-count. */
async function recomputeScore(playerId: string) {
  const d = db();
  const { data: moves } = await d.from("game_moves").select("points").eq("player_id", playerId);
  await d.from("game_players").update({ score: (moves ?? []).reduce((n, m) => n + m.points, 0) }).eq("id", playerId);
}

/** The seat after `current` in join order (wraps). */
function nextTurn(ms: TeamMember[], current: string | null) {
  if (!ms.length) return { turn: null, turn_at: new Date().toISOString() };
  const i = ms.findIndex((m) => m.id === current);
  return { turn: ms[(i + 1) % ms.length].id, turn_at: new Date().toISOString() };
}

/** Give up your turn without moving. */
export async function passTurn(playerId: string) {
  return mutate(playerId, () => ({ board: {}, rack: "", points: 0, key: "" }), true);
}

/** Any teammate may skip a player whose turn has run past TURN_MS. */
export async function skipTurn(playerId: string, now = Date.now()) {
  const d = db();
  const { data: me } = await d.from("game_players").select("team_id").eq("id", playerId).single();
  if (!me?.team_id) return { error: "You're not on a team." } as const;
  const board = await currentBoard(me.team_id);
  if (!board?.turn) return { ok: true } as const;
  if (board.turn_at && now - Date.parse(board.turn_at) < TURN_MS) return { error: "Give them a moment." } as const;
  const ms = await members(me.team_id);
  await d
    .from("game_boards")
    .update({ ...nextTurn(ms, board.turn), version: board.version + 1 })
    .eq("id", board.id)
    .eq("version", board.version);
  return { ok: true } as const;
}

export async function placeTile(playerId: string, slug: string, cell: string, letter: string, now = Date.now()) {
  const res = await mutate(
    playerId,
    (b, rack) => {
      const p = puzzleByKey(slug, b.puzzle_key);
      if (!p) return { error: "Unknown puzzle." };
      const want = isBonusCell(cell) ? bonusLetter(p, cell) : (solution(p)[cell] ?? null);
      if (!rack.includes(letter)) return { error: "That tile isn't in your rack." };
      if (!want) return { error: "Not a square." };
      if (b.placed[cell]) return { error: "Already filled." };
      if (want !== letter) return { error: "wrong" };
      const { drawn, bag } = draw(b.bag, 1);
      const placed = { ...b.placed, [cell]: { l: letter, p: playerId } };
      // Last letter of a bonus word: the placer takes the bonus.
      const word = isBonusCell(cell) ? cell.split(":")[1] : null;
      const finished = !!word && [...word].every((_, i) => placed[bonusCellKey(word, i)]);
      // Last letter of a crossword word (a crossing can finish two at once): +5 each.
      const wordsDone = word ? 0 : p.words.filter((w) => cellsOf(w).includes(cell) && cellsOf(w).every((k) => placed[k])).length;
      return {
        board: { placed, bag, ...(finished ? { bonus: { ...b.bonus, [word!]: playerId } } : {}) },
        rack: rack.replace(letter, "") + drawn,
        points: (VALUE[letter] ?? 1) + (finished ? BONUS_POINTS : 0) + wordsDone * WORD_POINTS,
        key: cell,
      };
    },
  );
  if ("error" in res) return res;
  // Solved? Every grid cell is placed (bonus squares don't count).
  const p = puzzleByKey(slug, res.board.puzzle_key)!;
  if (Object.keys(solution(p)).every((k) => res.board.placed[k])) await solveBoard(res.teamId, res.board, slug, now);
  return { ok: true } as const;
}

async function solveBoard(teamId: string, board: BoardRow, slug: string, now: number) {
  const d = db();
  const { data } = await d
    .from("game_boards")
    .update({ solved_at: new Date(now).toISOString() })
    .eq("id", board.id)
    .is("solved_at", null)
    .select("id");
  if (!data?.length) return; // already handled by a concurrent placement
  const { data: team } = await d.from("game_teams").select("solved, play_ms").eq("id", teamId).single();
  await d
    .from("game_teams")
    .update({ solved: (team?.solved ?? 0) + 1, play_ms: (team?.play_ms ?? 0) + (now - Date.parse(board.started_at)) })
    .eq("id", teamId);
  // Everyone on the team shares in the solve.
  const ms = await members(teamId);
  await d.from("game_moves").insert(ms.map((m) => ({ player_id: m.id, item_key: `${board.id}:solve`, points: SOLVE_POINTS })));
  await Promise.all(ms.map((m) => recomputeScore(m.id)));
  await nextBoard(teamId, slug);
}

export async function swapTile(playerId: string, letter: string) {
  return mutate(playerId, (b, rack) => {
    if (!rack.includes(letter)) return { error: "That tile isn't in your rack." };
    if (!b.bag.length) return { error: "The bag is empty." };
    const { drawn, bag } = draw(b.bag, 1);
    // Put the returned tile back somewhere random, not on top.
    const at = Math.floor(Math.random() * (bag.length + 1));
    return { board: { bag: bag.slice(0, at) + letter + bag.slice(at) }, rack: rack.replace(letter, "") + drawn, points: 0, key: "" };
  });
}

// ---------------------------------------------------------------------------
// Reading state
// ---------------------------------------------------------------------------
export async function teamRanking(sessionIds: string[]): Promise<(TeamRank & { session_id: string })[]> {
  if (!sessionIds.length) return [];
  const { data } = await db()
    .from("game_teams")
    .select("id, session_id, name, solved, play_ms, started_at, created_at, game_players(id)")
    .in("session_id", sessionIds);
  return ((data ?? []) as unknown as (Team & { game_players: { id: string }[] })[])
    .map((t) => ({
      id: t.id,
      session_id: t.session_id,
      name: t.name,
      solved: t.solved,
      play_ms: t.play_ms,
      members: t.game_players.length,
      started: !!t.started_at,
    }))
    .sort((a, b) => b.solved - a.solved || (a.solved ? a.play_ms - b.play_ms : 0) || Number(b.started) - Number(a.started));
}

export async function teamState(teamId: string, slug: string, now = Date.now()): Promise<TeamState | null> {
  const d = db();
  const { data: team } = await d.from("game_teams").select("*").eq("id", teamId).maybeSingle();
  if (!team) return null;
  const t = team as Team;
  const [ms, boards, ranking] = await Promise.all([
    members(teamId),
    d.from("game_boards").select("*").eq("team_id", teamId).order("started_at", { ascending: false }).then((r) => (r.data ?? []) as BoardRow[]),
    teamRanking([t.session_id]),
  ]);
  const open = boards.find((b) => !b.solved_at) ?? null;
  const lastSolved = boards.find((b) => b.solved_at) ?? null;
  const recent = lastSolved && now - Date.parse(lastSolved.solved_at!) < CELEBRATE_MS ? lastSolved : null;
  const p = open ? puzzleByKey(slug, open.puzzle_key) : null;
  const pos = ranking.findIndex((r) => r.id === teamId);
  return {
    team: t,
    members: ms,
    board: open && p ? { ...stripBag(open), puzzle: publicPuzzle(p), bag_left: open.bag.length } : null,
    justSolved: recent ? { puzzle_key: recent.puzzle_key, solved_at: recent.solved_at! } : null,
    rank: pos >= 0 ? { pos: pos + 1, of: ranking.length } : null,
    allDone: !!t.started_at && !open && puzzlesFor(slug).length > 0,
  };
}

const stripBag = (b: BoardRow): Omit<BoardRow, "bag"> => {
  const { bag, ...rest } = b;
  void bag;
  return rest;
};

// ---------------------------------------------------------------------------
// Practice players (test mode only). A bot is an ordinary player row named
// "… (bot)" with no token; the admin's open page drives it with botTick().
// ---------------------------------------------------------------------------
export const BOT_SUFFIX = " (bot)";
const BOT_NAMES = ["Jay Gatsby", "Daisy", "Nick", "Jordan", "Myrtle", "Owl Eyes", "Klipspringer"];

export async function addBot(sessionId: string, teamId: string) {
  const d = db();
  const { count } = await d.from("game_players").select("id", { count: "exact", head: true }).eq("team_id", teamId);
  if ((count ?? 0) >= TEAM_SIZE) return { error: "That team is full." } as const;
  const { data: taken } = await d.from("game_players").select("name").eq("session_id", sessionId);
  const used = new Set((taken ?? []).map((p) => p.name));
  const name = BOT_NAMES.map((n) => n + BOT_SUFFIX).find((n) => !used.has(n)) ?? `Extra ${Date.now() % 1000}${BOT_SUFFIX}`;
  const { data: bot, error } = await d
    .from("game_players")
    .insert({ session_id: sessionId, team_id: teamId, name })
    .select("id")
    .single();
  if (error || !bot) return { error: "Couldn't add a practice player." } as const;
  const board = await currentBoard(teamId);
  if (board) await dealRack(board, bot.id);
  return { ok: true } as const;
}

/** One bot move: place a correct tile if the rack has one, else swap a random tile. */
export async function botTick(botId: string, slug: string) {
  const d = db();
  const { data: bot } = await d.from("game_players").select("id, team_id, rack, name").eq("id", botId).single();
  if (!bot?.team_id || !bot.name.endsWith(BOT_SUFFIX)) return { error: "Not a bot." } as const;
  const board = await currentBoard(bot.team_id);
  if (!board || (board.turn && board.turn !== botId)) return { ok: true } as const;
  const p = puzzleByKey(slug, board.puzzle_key);
  if (!p) return { ok: true } as const;
  const sol: Record<string, string> = { ...solution(p) };
  for (const w of p.bonus) [...w].forEach((ch, i) => (sol[bonusCellKey(w, i)] = ch));
  const open = Object.keys(sol).filter((k) => !board.placed[k]);
  const fit = open.find((k) => bot.rack.includes(sol[k]));
  if (fit) return placeTile(botId, slug, fit, sol[fit]);
  if (bot.rack) return swapTile(botId, bot.rack[Math.floor(Math.random() * bot.rack.length)]);
  return { ok: true } as const;
}
