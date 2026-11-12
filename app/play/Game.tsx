"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { TeamState } from "@/lib/game-teams";
import {
  autoTeamAction,
  claimGame,
  createTeamAction,
  fetchTeam,
  joinGame,
  joinTeamAction,
  passTurnAction,
  placeTileAction,
  skipTurnAction,
  renameTeamAction,
  startTeamAction,
  swapTileAction,
} from "./actions";
import { adminAddBot, adminBotTick } from "./admin-actions";
import { BOT_SUFFIX, TURN_MS } from "@/lib/game-teams";
import Crossword, { COLORS, type Member } from "./Crossword";
import Celebration from "./Celebration";
import { TeamChooser, WaitingRoom, type OpenTeam } from "./TeamLobby";
import s from "./play.module.css";

const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

/**
 * The lobby game, phone side: name → team → waiting room → crossword, with a
 * celebration between grids and at curtain. The server owns every rule; this
 * component only renders TeamState and calls actions.
 */
export default function Game({
  sessionId,
  slug,
  live,
  me,
  openTeams,
  initialTeam,
  testMode,
  serverNow,
}: {
  sessionId: string;
  slug: string;
  live: boolean;
  me: { id: string; name: string; team_id: string | null } | null;
  openTeams: OpenTeam[];
  initialTeam: TeamState | null;
  /** Admin on a rehearsal: can add practice players, and this page drives their moves. */
  testMode?: boolean;
  /** Server clock at render, so the first client render matches the HTML. */
  serverNow: number;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [exists, setExists] = useState<{ id: string; name: string; score: number; team: string | null } | null>(null);
  const [busy, start] = useTransition();
  const [team, setTeam] = useState(initialTeam);
  const [seen, setSeen] = useState(initialTeam);
  if (seen !== initialTeam) {
    setSeen(initialTeam);
    setTeam(initialTeam);
  }

  useEffect(() => {
    document.getElementById("game")?.scrollIntoView({ block: "start" });
  }, []);

  // 1s clock for the turn timer.
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Realtime: any change to my team, its board or its players → refetch.
  const teamId = me?.team_id ?? null;
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!teamId || !live) return;
    const sb = createClient();
    const refetch = () => {
      if (pending.current) return;
      pending.current = setTimeout(async () => {
        pending.current = null;
        setTeam(await fetchTeam(teamId, slug));
      }, 250);
    };
    const ch = sb
      .channel(`team-${teamId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_boards", filter: `team_id=eq.${teamId}` }, refetch)
      // Session-wide, so a teammate switching away (team_id changes) is noticed too.
      .on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `session_id=eq.${sessionId}` }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_teams", filter: `id=eq.${teamId}` }, refetch)
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [teamId, live, slug, sessionId]);

  // Test mode: every few seconds let each practice player on my team move.
  const botIds = (team?.members ?? []).filter((m) => m.name.endsWith(BOT_SUFFIX)).map((m) => m.id).join(",");
  const started = !!team?.team.started_at;
  useEffect(() => {
    if (!testMode || !live || !started || !botIds) return;
    const t = setInterval(() => {
      for (const id of botIds.split(",")) adminBotTick(sessionId, id);
    }, 5000);
    return () => clearInterval(t);
  }, [testMode, live, started, botIds, sessionId]);

  const run = (fn: () => Promise<{ error?: string } | unknown>, refresh = true) =>
    start(async () => {
      setErr(null);
      const res = (await fn()) as { error?: string } | null;
      if (res && "error" in res && res.error) setErr(res.error);
      else if (refresh) router.refresh();
      else if (teamId) setTeam(await fetchTeam(teamId, slug));
    });

  // 1. Name
  if (!me) {
    if (!live) return <p className={s.finished}>The game has closed for tonight.</p>;
    if (exists) {
      return (
        <div className={s.join}>
          <p className={s.qText}>
            <b>{exists.name}</b> is already playing{exists.team ? ` on ${exists.team}` : ""} with {exists.score} pts. Is that you?
          </p>
          <button className={s.btn} disabled={busy} onClick={() => run(() => claimGame(sessionId, exists.id))}>
            Yes, that&rsquo;s me — pick up where I left off
          </button>
          <button className={s.btnGhost} disabled={busy} onClick={() => { setExists(null); run(() => joinGame(sessionId, name, true)); }}>
            No, I&rsquo;m someone else
          </button>
          {err && <p className={s.err}>{err}</p>}
        </div>
      );
    }
    return (
      <form
        suppressHydrationWarning
        className={s.join}
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            setErr(null);
            const res = await joinGame(sessionId, name);
            if ("exists" in res && res.exists) setExists(res.exists);
            else if ("error" in res) setErr(res.error ?? null);
            else router.refresh();
          });
        }}
      >
        <label className={s.joinLabel} htmlFor="name">Your name for the board</label>
        <input suppressHydrationWarning id="name" className={s.input} value={name} onChange={(e) => setName(e.target.value)} maxLength={24} autoComplete="nickname" placeholder="Old Sport" required />
        <button className={s.btn} disabled={busy}>{busy ? "Joining…" : "Join the party"}</button>
        {err && <p className={s.err}>{err}</p>}
      </form>
    );
  }

  // 2. Team
  if (!teamId || !team) {
    if (!live) return <p className={s.finished}>Thanks for playing, {me.name}. Scroll up for the final board.</p>;
    return (
      <>
        <p className={s.playing}>Playing as <b>{me.name}</b></p>
        <TeamChooser
          teams={openTeams}
          busy={busy}
          onCreate={() => run(() => createTeamAction(sessionId))}
          onJoin={(id) => run(() => joinTeamAction(sessionId, id))}
          onSolo={() => run(() => autoTeamAction(sessionId))}
        />
        {err && <p className={s.err}>{err}</p>}
      </>
    );
  }

  const members: Member[] = team.members.map((m, i) => ({ id: m.id, name: m.name, score: m.score, color: COLORS[i % COLORS.length] }));
  const byScore = [...members].sort((a, b) => b.score - a.score);
  const rankText = team.rank ? `#${team.rank.pos} of ${team.rank.of} team${team.rank.of === 1 ? "" : "s"} tonight` : null;
  const stats = `${team.team.solved} grid${team.team.solved === 1 ? "" : "s"} solved${team.team.solved ? ` · ${mmss(team.team.play_ms)}` : ""}`;

  // 3. Curtain
  if (!live) return <Celebration title="Curtain!" team={team.team.name} members={byScore} rank={rankText} sub={stats} />;

  // 4. Waiting room
  if (!team.team.started_at) {
    return (
      <>
        <WaitingRoom
          team={team.team}
          members={members}
          meId={me.id}
          canRename
          busy={busy}
          onRename={(n) => run(() => renameTeamAction(sessionId, n), false)}
          onStart={() => run(() => startTeamAction(sessionId), false)}
        />
        {testMode && members.length < 4 && (
          <button className={s.botBtn} disabled={busy} onClick={() => run(() => adminAddBot(sessionId), false)}>
            + Add a practice player (test mode)
          </button>
        )}
        {err && <p className={s.err}>{err}</p>}
        {team.team.is_open && (
          <TeamChooser
            compact
            teams={openTeams.filter((t) => t.id !== teamId)}
            busy={busy}
            onCreate={() => run(() => createTeamAction(sessionId))}
            onJoin={(id) => run(() => joinTeamAction(sessionId, id))}
          />
        )}
      </>
    );
  }

  // 5. All grids done
  if (team.allDone && !team.board) {
    return <Celebration title="Every grid solved!" team={team.team.name} members={byScore} rank={rankText} sub={`${stats} · Scroll up to watch the board until curtain.`} />;
  }

  // 6. Playing (with a short celebration after each solve)
  const myRack = team.members.find((m) => m.id === me.id)?.rack ?? "";
  return (
    <SolvedThenBoard key={team.justSolved?.solved_at ?? "none"} solvedAt={team.justSolved?.solved_at ?? null}>
      {team.justSolved && (
        <Celebration title="Solved!" team={team.team.name} members={byScore} rank={rankText} sub={`${stats} · Next grid coming up…`} />
      )}
      {team.board && (
        <>
          <div className={s.teamBar}>
            <span className={s.teamBarName}>{team.team.name}</span>
            <span>{stats}</span>
            {rankText && <span>{rankText}</span>}
          </div>
          {(() => {
            const b = team.board;
            const turnM = members.find((m) => m.id === b.turn);
            const mine = !b.turn || b.turn === me.id;
            const waited = b.turn_at ? now - Date.parse(b.turn_at) : 0;
            const left = Math.max(0, Math.ceil((TURN_MS - waited) / 1000));
            return (
              <div className={`${s.turn} ${mine ? s.turnMine : ""}`} style={turnM ? { ["--who" as string]: turnM.color } : undefined}>
                <span className={s.turnWho}>
                  {mine ? "Your turn" : `${turnM?.name ?? "Teammate"}'s turn`}
                  {!mine && left > 0 && <small> · {left}s</small>}
                </span>
                {mine ? (
                  <button className={s.turnBtn} disabled={busy} onClick={() => run(() => passTurnAction(sessionId), false)}>Pass</button>
                ) : left === 0 ? (
                  <button className={s.turnBtn} disabled={busy} onClick={() => run(() => skipTurnAction(sessionId), false)}>Skip them</button>
                ) : null}
              </div>
            );
          })()}
          <Crossword
            locked={!!team.board.turn && team.board.turn !== me.id}
            puzzle={team.board.puzzle}
            placed={team.board.placed}
            members={members}
            meId={me.id}
            rack={myRack}
            bonus={team.board.bonus}
            busy={busy}
            onPlace={async (cell, letter) => {
              const res = await placeTileAction(sessionId, cell, letter);
              if ("error" in res) {
                if (res.error !== "wrong") setErr(res.error ?? null);
                return false;
              }
              setErr(null);
              setTeam(await fetchTeam(teamId, slug));
              return true;
            }}
            onSwap={(l) => run(() => swapTileAction(sessionId, l), false)}
          />
          {testMode && members.length < 4 && (
            <button className={s.botBtn} disabled={busy} onClick={() => run(() => adminAddBot(sessionId), false)}>
              + Add a practice player (test mode)
            </button>
          )}
          {err && <p className={s.err}>{err}</p>}
        </>
      )}
    </SolvedThenBoard>
  );
}

/** Shows the first child (the celebration) alone for a few seconds, then the rest. */
function SolvedThenBoard({ solvedAt, children }: { solvedAt: string | null; children: React.ReactNode }) {
  const [celebrating, setCelebrating] = useState(!!solvedAt);
  useEffect(() => {
    if (!solvedAt) return;
    const left = Math.max(500, 6000 - (Date.now() - Date.parse(solvedAt)));
    const t = setTimeout(() => setCelebrating(false), left);
    return () => clearTimeout(t);
  }, [solvedAt]);
  const [celebration, ...rest] = Array.isArray(children) ? children : [children];
  return <div className={s.gameBody}>{celebrating && solvedAt ? celebration : rest}</div>;
}
