"use client";

import { useMemo, useState } from "react";
import { BONUS_POINTS, VALUE, bonusCellKey, cellKey, publicCells, type PublicPuzzle } from "@/lib/puzzles";
import s from "./play.module.css";

export type Member = { id: string; name: string; score: number; color: string };
export type Placed = Record<string, { l: string; p: string | null }>; // cell → letter, placer (null = given)

export const COLORS = ["#3dff9a", "#f1d98a", "#ff8fb1", "#8fc8ff"];
export const colorOf = (members: Member[], id: string | null) =>
  members.find((m) => m.id === id)?.color ?? "rgba(243,234,214,.35)";

/**
 * The game screen: clue strip, grid, bonus chips, rack. Pure UI — the parent
 * owns state and does the server calls. Tap a square to make it active (its
 * word highlights, its clue shows), tap a rack tile to drop it there. After a
 * drop the next empty square of the same word becomes active.
 */
export default function Crossword({
  puzzle,
  placed,
  members,
  meId,
  rack,
  bonus,
  busy,
  locked,
  onPlace,
  onSwap,
}: {
  puzzle: PublicPuzzle;
  placed: Placed;
  members: Member[];
  meId: string;
  rack: string;
  bonus: Record<string, string>; // word → player id who finished it
  busy?: boolean;
  /** Not this player's turn: squares still select, but tiles/swap/bonus are frozen. */
  locked?: boolean;
  onPlace: (cell: string, letter: string) => Promise<boolean>;
  onSwap: (letter: string) => void;
}) {
  // Grid words first, then each bonus word as a row of its own squares.
  const words = useMemo(
    () => [
      ...puzzle.words.map((w) => ({ ...w, cells: publicCells(w), bonus: null as string | null })),
      ...puzzle.bonus.map((b) => ({
        clue: `Bonus word: spell ${b}. Whoever places the last letter gets +${BONUS_POINTS}.`,
        row: -1, col: -1, dir: "a" as const, len: b.length,
        cells: [...b].map((_, i) => bonusCellKey(b, i)),
        bonus: b,
      })),
    ],
    [puzzle],
  );
  const gridCount = puzzle.words.length;
  const cellWords = useMemo(() => {
    const m = new Map<string, number[]>();
    words.forEach((w, i) => w.cells.forEach((c) => m.set(c, [...(m.get(c) ?? []), i])));
    return m;
  }, [words]);

  const firstEmpty = () => {
    for (let i = 0; i < gridCount; i++) {
      const c = words[i].cells.find((k) => !placed[k]);
      if (c) return { cell: c, word: i };
    }
    return null;
  };
  const [active, setActive] = useState<{ cell: string; word: number } | null>(firstEmpty);
  const [swapMode, setSwapMode] = useState(false);
  const [shake, setShake] = useState<number | null>(null);
  const [miss, setMiss] = useState<string | null>(null);

  // If the active square got filled by a teammate, move on.
  const act = active && !placed[active.cell] ? active : firstEmpty();
  const activeWord = act ? words[act.word] : null;

  const tapCell = (k: string) => {
    const ws = cellWords.get(k);
    if (!ws) return;
    // Same square again: flip between its across and down word.
    const next = act?.cell === k && ws.length > 1 ? ws[(ws.indexOf(act.word) + 1) % ws.length] : ws.includes(act?.word ?? -1) ? act!.word : ws[0];
    setActive({ cell: k, word: next });
    setSwapMode(false);
    setMiss(null);
  };

  const tapTile = async (i: number) => {
    const letter = rack[i];
    if (swapMode) {
      setSwapMode(false);
      onSwap(letter);
      return;
    }
    if (!act || busy || locked) return;
    const ok = await onPlace(act.cell, letter);
    if (!ok) {
      setShake(i);
      setMiss(`${letter} doesn't go in that square. Check the clue.`);
      setTimeout(() => setShake(null), 500);
      return;
    }
    setMiss(null);
    // Advance along the same word, else to the next unfinished word.
    const w = words[act.word];
    const after = w.cells.slice(w.cells.indexOf(act.cell) + 1).find((k) => !placed[k] && k !== act.cell);
    setActive(after ? { cell: after, word: act.word } : null);
  };

  const done = words.slice(0, gridCount).filter((w) => w.cells.every((k) => placed[k])).length;

  return (
    <div className={s.xw}>
      <div className={s.clueStrip}>
        {activeWord ? (
          <>
            <span className={s.clueDir}>{activeWord.bonus ? "Bonus" : activeWord.dir === "a" ? "Across" : "Down"} · {activeWord.len} letters</span>
            <span className={s.clueText}>{activeWord.clue}</span>
            {miss && <span className={s.miss}>{miss}</span>}
          </>
        ) : (
          <span className={s.clueText}>Grid complete</span>
        )}
        <span className={s.clueCount}>{done}/{gridCount} words</span>
      </div>

      <div
        className={s.grid}
        style={{ gridTemplateColumns: `repeat(${puzzle.cols}, 1fr)` }}
        role="grid"
        aria-label="Crossword"
      >
        {Array.from({ length: puzzle.rows * puzzle.cols }, (_, i) => {
          const k = cellKey(Math.floor(i / puzzle.cols), i % puzzle.cols);
          const ws = cellWords.get(k);
          if (!ws) return <span key={k} className={s.void} aria-hidden />;
          const t = placed[k];
          const inWord = act ? ws.includes(act.word) : false;
          const isActive = act?.cell === k;
          return (
            <button
              key={k}
              type="button"
              role="gridcell"
              className={`${s.cell} ${inWord ? s.cellWord : ""} ${isActive ? s.cellActive : ""} ${t ? s.cellFilled : ""}`}
              style={t?.p ? { ["--who" as string]: colorOf(members, t.p) } : undefined}
              onClick={() => tapCell(k)}
              aria-label={t ? `${t.l}` : "empty"}
            >
              {t?.l ?? ""}
            </button>
          );
        })}
      </div>

      <div className={s.bonusWrap} aria-label="Bonus words">
        <div className={s.bonusHead}>Bonus words · last letter in gets +{BONUS_POINTS}</div>
        <div className={s.bonusRows}>
          {words.slice(gridCount).map((w, wi) => {
            const idx = gridCount + wi;
            const by = bonus[w.bonus!];
            return (
              <div key={w.bonus} className={`${s.bonusWord} ${by ? s.bonusDone : ""}`} style={by ? { ["--who" as string]: colorOf(members, by) } : undefined}>
                <span className={s.bonusLabel}>{w.bonus}</span>
                <span className={s.bonusCells}>
                  {w.cells.map((k) => {
                    const t = placed[k];
                    return (
                      <button
                        key={k}
                        type="button"
                        className={`${s.cell} ${s.cellMini} ${act?.word === idx ? s.cellWord : ""} ${act?.cell === k ? s.cellActive : ""} ${t ? s.cellFilled : ""}`}
                        style={t?.p ? { ["--who" as string]: colorOf(members, t.p) } : undefined}
                        onClick={() => tapCell(k)}
                        aria-label={t ? t.l : "empty bonus"}
                      >
                        {t?.l ?? ""}
                      </button>
                    );
                  })}
                </span>
                <span className={s.bonusBy}>{by ? members.find((m) => m.id === by)?.name ?? "" : ""}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`${s.rack} ${swapMode ? s.rackSwap : ""} ${locked ? s.rackLocked : ""}`}>
        {[...rack].map((l, i) => (
          <button
            key={`${i}-${l}`}
            type="button"
            className={`${s.tile} ${shake === i ? s.tileShake : ""}`}
            disabled={busy || locked}
            onClick={() => tapTile(i)}
            aria-label={`Tile ${l}, ${VALUE[l]} points`}
          >
            {l}
            <small>{VALUE[l]}</small>
          </button>
        ))}
        <button
          type="button"
          className={`${s.swapBtn} ${swapMode ? s.swapOn : ""}`}
          disabled={busy || locked}
          onClick={() => setSwapMode((v) => !v)}
          aria-pressed={swapMode}
        >
          {swapMode ? "Tap a tile" : "Swap"}
        </button>
      </div>
      <p className={s.hint}>
        {locked
          ? "Your tiles unlock on your turn. You can still tap squares to read the clues."
          : swapMode
          ? "Tap the tile you want to put back in the bag."
          : act
            ? "Tap a tile to drop it in the lit square. Tap another square to move."
            : "Nothing left to fill."}
      </p>
      <div className={s.members}>
        {members.map((m) => (
          <span key={m.id} className={s.member} style={{ ["--who" as string]: m.color }}>
            <i />{m.name}{m.id === meId ? " (you)" : ""} <b>{m.score}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
