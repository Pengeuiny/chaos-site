"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Board } from "@/lib/game";
import type { TeamRank } from "@/lib/game-teams";
import { fetchBoard } from "./actions";
import s from "./play.module.css";

type Win = { id: string; opens_at: string; closes_at: string; is_rehearsal: boolean; label: string | null };

const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

function TeamRows({ teams, myTeamId, live }: { teams: TeamRank[]; myTeamId: string | null; live: boolean }) {
  const myIdx = teams.findIndex((t) => t.id === myTeamId);
  if (!teams.length) return <p className={s.empty}>{live ? "No teams yet. Be the first." : "No teams played."}</p>;
  return (
    <>
      {myIdx >= 0 && (
        <div className={s.me}>
          Your team is <b>#{myIdx + 1}</b> of {teams.length}
        </div>
      )}
      <ol className={s.rows}>
        {teams.slice(0, 50).map((t, i) => (
          <li key={t.id} className={`${s.row} ${t.id === myTeamId ? s.rowMe : ""}`}>
            <span className={s.rank}>{i + 1}</span>
            <span className={s.name}>
              {t.name}
              <em className={`${s.night} ${s.subline}`}>{t.night ? `${t.night} · ` : ""}{t.members} player{t.members === 1 ? "" : "s"}</em>
            </span>
            <span className={s.score}>{t.solved ? `${t.solved} grid${t.solved === 1 ? "" : "s"} · ${mmss(t.play_ms)}` : t.started ? "playing" : "waiting"}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

const time = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });

function countdown(ms: number) {
  const t = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  return h ? `${h}h ${m}m` : `${m}:${String(sec).padStart(2, "0")}`;
}

/**
 * Live light + leaderboard. Subscribes to game_players changes only while the
 * session is live (nothing changes otherwise) and refetches the board from the
 * server on each burst. Refreshes the page when the window opens or closes.
 */
export default function LiveBoard({
  productionId,
  title,
  session,
  nextOpensAt,
  initial,
  meId,
  myTeamId,
  fixedLight,
  playHref,
  serverNow,
}: {
  productionId: string;
  title: string;
  session: Win | null;
  nextOpensAt: string | null;
  initial: Board;
  meId?: string | null;
  myTeamId?: string | null;
  fixedLight?: boolean;
  playHref?: string;
  /** Server clock at render, so countdown text hydrates without a mismatch. */
  serverNow: number;
}) {
  const router = useRouter();
  const [board, setBoard] = useState(initial);
  const [tab, setTab] = useState<"tonight" | "all" | "teams">(initial.tonight.length || !initial.all.length ? "tonight" : "all");
  const [now, setNow] = useState(serverNow);
  // Take a fresh server board after router.refresh() (React's "adjust state on prop change").
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setBoard(initial);
  }

  const closes = session ? Date.parse(session.closes_at) : 0;
  const live = !!session && Date.parse(session.opens_at) <= now && now < closes;
  const opens = nextOpensAt ? Date.parse(nextOpensAt) : null;

  // Tick, and re-render from the server when a window boundary passes.
  const boundary = live ? closes : opens;
  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (boundary && n >= boundary) {
        clearInterval(t);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [boundary, router]);

  const sessionId = session?.id ?? null;
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!live) return;
    const sb = createClient();
    const ch = sb
      .channel(`board-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_players", filter: `session_id=eq.${sessionId}` },
        () => {
          // ponytail: refetch the whole board per burst (≤1/s); fine for a few hundred players.
          if (pending.current) return;
          pending.current = setTimeout(async () => {
            pending.current = null;
            setBoard(await fetchBoard(productionId, sessionId));
          }, 800);
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [live, sessionId, productionId]);

  const rows = tab === "tonight" ? board.tonight : board.all;
  const myIdx = meId ? rows.findIndex((r) => r.id === meId) : -1;
  const lightText = live
    ? `LIVE · ${board.tonight.length}`
    : opens
      ? `Opens in ${countdown(opens - now)}`
      : "Closed";

  const light = (
    <a
      href="#board"
      className={`${s.light} ${fixedLight ? s.lightFixed : ""}`}
      aria-label={live ? "Game is live. Jump to the leaderboard" : "Game is not live. Jump to the leaderboard"}
    >
      <span className={`${s.led} ${live ? s.ledOn : ""}`} aria-hidden />
      <span className={s.lightText}>{lightText}</span>
    </a>
  );

  return (
    <>
      {light}
      <section id="board" className={s.board} aria-live="polite">
        <div className={s.boardHead}>
          <h2 className={s.h2}>Leaderboard</h2>
          <p className={s.sub}>
            {live
              ? `${session?.is_rehearsal ? "Rehearsal, open" : "Live"} until ${session?.is_rehearsal ? "" : "curtain · "}${time(session!.closes_at)}`
              : session
                ? `Final results · ${session.label ?? time(session.opens_at)}`
                : opens
                  ? `First game opens ${time(nextOpensAt!)}`
                  : "No games yet"}
          </p>
        </div>

        <div className={s.tabs} role="tablist">
          <button role="tab" aria-selected={tab === "tonight"} className={tab === "tonight" ? s.tabOn : s.tab} onClick={() => setTab("tonight")}>
            {live ? "Tonight" : "Latest night"}
          </button>
          <button role="tab" aria-selected={tab === "all"} className={tab === "all" ? s.tabOn : s.tab} onClick={() => setTab("all")}>
            All of {title}
          </button>
          <button role="tab" aria-selected={tab === "teams"} className={tab === "teams" ? s.tabOn : s.tab} onClick={() => setTab("teams")}>
            Teams
          </button>
        </div>

        {tab === "teams" && (
          <TeamRows teams={live || !board.teamsAll.length ? board.teams : board.teamsAll} myTeamId={myTeamId ?? null} live={live} />
        )}

        {tab !== "teams" && myIdx >= 0 && (
          <div className={s.me}>
            You&rsquo;re <b>#{myIdx + 1}</b> of {rows.length} · {rows[myIdx].score} pts
          </div>
        )}

        {tab === "teams" ? null : rows.length ? (
          <ol className={s.rows}>
            {rows.slice(0, 50).map((r, i) => (
              <li key={r.id} className={`${s.row} ${r.id === meId ? s.rowMe : ""}`}>
                <span className={s.rank}>{i + 1}</span>
                <span className={s.name}>
                  {r.name}
                  {"night" in r && <em className={s.night}>{(r as { night: string }).night}</em>}
                </span>
                <span className={s.score}>{r.score}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className={s.empty}>{live ? "Be the first on the board." : "Nobody on the board yet."}</p>
        )}

        {board.nights.length > 1 && (
          <div className={s.nights}>
            {board.nights.map((n) => (
              <div key={n.session_id} className={`${s.nightCard} ${n.session_id === sessionId ? s.nightOn : ""}`}>
                <div className={s.nightLabel}>{n.label}</div>
                <div className={s.nightStat}><b>{n.players}</b> players</div>
                <div className={s.nightStat}>Top <b>{n.top}</b> · Avg <b>{n.avg}</b></div>
              </div>
            ))}
          </div>
        )}

        {playHref && (
          <a className={s.cta} href={playHref}>
            {live ? "Play now" : "Open the game"} →
          </a>
        )}
      </section>
    </>
  );
}
