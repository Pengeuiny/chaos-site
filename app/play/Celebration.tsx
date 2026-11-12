"use client";

import type { Member } from "./Crossword";
import s from "./play.module.css";

const BUBBLES = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  size: 6 + ((i * 13) % 14),
  delay: ((i * 7) % 20) / 10,
  dur: 3 + ((i * 11) % 25) / 10,
}));

/** Replaces the grid for a few seconds when a team solves, and at curtain. */
export default function Celebration({
  title,
  team,
  members,
  rank,
  sub,
}: {
  title: string; // "Solved!" or "Curtain!"
  team: string;
  members: Member[]; // sorted by score desc
  rank: string | null; // e.g. "#2 of 14 teams tonight"
  sub?: string;
}) {
  const [winner, ...rest] = members;
  return (
    <div className={s.celebrate} role="status" aria-live="polite">
      <div className={s.bubbles} aria-hidden>
        {BUBBLES.map((b, i) => (
          <i
            key={i}
            style={{ left: `${b.left}%`, width: b.size, height: b.size, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }}
          />
        ))}
      </div>
      <p className={s.celebKick}>{title}</p>
      <p className={s.celebTeam}>{team}</p>
      {winner && (
        <>
          <p className={s.celebLabel}>Winner</p>
          <p className={s.celebName}>{winner.name}</p>
          <p className={s.celebPts}>{winner.score} pts</p>
        </>
      )}
      {rest.length > 0 && (
        <ol className={s.celebRest}>
          {rest.map((m, i) => (
            <li key={m.id} style={{ ["--who" as string]: m.color }}>
              <span>{i + 2}.</span> {m.name} <b>{m.score}</b>
            </li>
          ))}
        </ol>
      )}
      {rank && <p className={s.celebRank}>{rank}</p>}
      {sub && <p className={s.celebSub}>{sub}</p>}
    </div>
  );
}
