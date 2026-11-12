// Crossword content for the lobby game. Pure data + pure helpers; no I/O.
// ponytail: hard-coded per production slug. Move to a table with an admin
// editor when the second show needs puzzles.

export type Word = { answer: string; clue: string; row: number; col: number; dir: "a" | "d" };
export type Puzzle = { key: string; rows: number; cols: number; words: Word[]; bonus: string[] };

/** Scrabble letter values, printed on the tiles and scored on placement. */
export const VALUE: Record<string, number> = {
  A: 1, E: 1, I: 1, O: 1, U: 1, L: 1, N: 1, S: 1, T: 1, R: 1,
  D: 2, G: 2, B: 3, C: 3, M: 3, P: 3, F: 4, H: 4, V: 4, W: 4, Y: 4,
  K: 5, J: 8, X: 8, Q: 10, Z: 10,
};

/** Scoring: tiles score face value everywhere; finishing a crossword word +5,
 * finishing a bonus word +10, and every member gets +20 when the grid is solved. */
export const WORD_POINTS = 5;
export const BONUS_POINTS = 10;
export const SOLVE_POINTS = 20;
export const RACK_SIZE = 5;
/** A few spare common letters so the bag never runs dry with 4 racks out. */
const EXTRAS = "AEEIOSTRN";

const GATSBY: Puzzle[] = [
  {
    key: "g1", rows: 9, cols: 8,
    words: [
      { answer: "WESTEGG", clue: "Gatsby's side of the bay", row: 3, col: 0, dir: "a" },
      { answer: "WILSON", clue: "He runs the garage in the Valley of Ashes", row: 3, col: 0, dir: "d" },
      { answer: "GATSBY", clue: "Our host, who throws the parties", row: 3, col: 5, dir: "d" },
      { answer: "SHIRTS", clue: "Daisy cries over a pile of them", row: 6, col: 0, dir: "a" },
      { answer: "DAISY", clue: "Her voice is full of money", row: 0, col: 2, dir: "d" },
      { answer: "ASHES", clue: "The valley between the Eggs and the city", row: 1, col: 2, dir: "a" },
      { answer: "BAY", clue: "The water between the two Eggs", row: 7, col: 5, dir: "a" },
      { answer: "NICK", clue: "Our narrator, Mr. Carraway", row: 8, col: 0, dir: "a" },
      { answer: "TOM", clue: "Daisy's husband, old money and polo ponies", row: 5, col: 5, dir: "a" },
    ],
    bonus: ["DOCK", "EYES", "RICH", "CAR", "GIN"],
  },
  {
    key: "g2", rows: 10, cols: 10,
    words: [
      { answer: "GREENLIGHT", clue: "What glows at the end of Daisy's dock", row: 5, col: 0, dir: "a" },
      { answer: "PARTY", clue: "What Gatsby throws every weekend", row: 2, col: 9, dir: "d" },
      { answer: "OXFORD", clue: "Where Gatsby says he studied", row: 1, col: 1, dir: "d" },
      { answer: "OLDSPORT", clue: "Gatsby's two-word greeting", row: 1, col: 1, dir: "a" },
      { answer: "POOL", clue: "Gatsby finally uses his, once", row: 0, col: 6, dir: "d" },
      { answer: "PLAZA", clue: "The hotel where it all boils over", row: 3, col: 5, dir: "a" },
      { answer: "GIN", clue: "A Prohibition-era pour", row: 5, col: 7, dir: "d" },
      { answer: "YELLOW", clue: "Colour of the car", row: 4, col: 3, dir: "d" },
      { answer: "BONDS", clue: "What Nick sells in the city", row: 8, col: 2, dir: "a" },
    ],
    bonus: ["EYES", "HOPE", "GOLD", "SHIRT", "BAY"],
  },
  {
    key: "g3", rows: 10, cols: 9,
    words: [
      { answer: "WOLFSHEIM", clue: "Gatsby's business associate with the odd cufflinks", row: 6, col: 0, dir: "a" },
      { answer: "GARAGE", clue: "Wilson's workplace", row: 1, col: 6, dir: "d" },
      { answer: "LEVY", clue: "Simon, who adapted the play", row: 6, col: 2, dir: "d" },
      { answer: "WAR", clue: "Gatsby and Nick both served in the Great one", row: 6, col: 0, dir: "d" },
      { answer: "JAZZ", clue: "The age this story lives in", row: 2, col: 5, dir: "a" },
      { answer: "MANSION", clue: "Gatsby's enormous house", row: 3, col: 4, dir: "d" },
      { answer: "DREAM", clue: "The American kind", row: 3, col: 0, dir: "a" },
      { answer: "MONEY", clue: "Old and new kinds collide here", row: 0, col: 2, dir: "d" },
      { answer: "NOVEL", clue: "What Fitzgerald published in 1925", row: 9, col: 4, dir: "a" },
      { answer: "HOPE", clue: "Gatsby's 'extraordinary gift' for it", row: 1, col: 1, dir: "a" },
    ],
    bonus: ["DAISY", "POOL", "LAWN", "GIN", "EGG"],
  },
];

const BY_SLUG: Record<string, Puzzle[]> = { "the-great-gatsby": GATSBY };

export const puzzlesFor = (slug: string) => BY_SLUG[slug] ?? [];
export const puzzle = (slug: string, key: string) => puzzlesFor(slug).find((p) => p.key === key) ?? null;

export const cellKey = (r: number, c: number) => `${r},${c}`;

/** Every lettered cell → its answer letter. */
export function solution(p: Puzzle): Record<string, string> {
  const out: Record<string, string> = {};
  for (const w of p.words)
    for (let i = 0; i < w.answer.length; i++)
      out[cellKey(w.row + (w.dir === "d" ? i : 0), w.col + (w.dir === "a" ? i : 0))] = w.answer[i];
  return out;
}

/** First letter of every word is given, so there's always a foothold. */
export function givens(p: Puzzle): Record<string, string> {
  const out: Record<string, string> = {};
  for (const w of p.words) out[cellKey(w.row, w.col)] = w.answer[0];
  return out;
}

/** Bonus-word squares live in `placed` under these keys, beside the grid cells. */
export const bonusCellKey = (word: string, i: number) => `b:${word}:${i}`;
export const isBonusCell = (k: string) => k.startsWith("b:");
/** Letter a bonus-word square wants, or null if the key isn't one of this puzzle's. */
export function bonusLetter(p: Puzzle, k: string): string | null {
  const m = /^b:([A-Z]+):(\d+)$/.exec(k);
  if (!m || !p.bonus.includes(m[1])) return null;
  return m[1][Number(m[2])] ?? null;
}

/** The team's tile bag at the start: every grid letter still to be placed, every bonus-word letter, plus extras, shuffled. */
export function freshBag(p: Puzzle, rnd = Math.random): string {
  const sol = solution(p), giv = givens(p);
  const letters = Object.keys(sol).filter((k) => !giv[k]).map((k) => sol[k]).concat([...p.bonus.join("")], [...EXTRAS]);
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return letters.join("");
}

/** Draw n tiles off the front of the bag. */
export function draw(bag: string, n: number): { drawn: string; bag: string } {
  return { drawn: bag.slice(0, n), bag: bag.slice(n) };
}

/** Can `rack` spell `word` (multiset containment)? */
export function canSpell(rack: string, word: string) {
  let left = rack;
  for (const ch of word) {
    const i = left.indexOf(ch);
    if (i < 0) return false;
    left = left.slice(0, i) + left.slice(i + 1);
  }
  return true;
}

/** Remove the letters of `word` from `rack` once each. Assumes canSpell. */
export function spend(rack: string, word: string) {
  let left = rack;
  for (const ch of word) left = left.replace(ch, "");
  return left;
}

/** Cells of a word, in order. */
export const cellsOf = (w: Word) =>
  [...w.answer].map((_, i) => cellKey(w.row + (w.dir === "d" ? i : 0), w.col + (w.dir === "a" ? i : 0)));

// Self-check: every bonus word is spellable from the puzzle's letters and the
// grid is consistent (crossings agree). Run: npx tsx lib/puzzles.ts
if (process.argv[1]?.endsWith("puzzles.ts")) {
  for (const p of GATSBY) {
    const sol = solution(p);
    for (const w of p.words)
      for (let i = 0; i < w.answer.length; i++) {
        const k = cellsOf(w)[i];
        if (sol[k] !== w.answer[i]) throw new Error(`${p.key}: crossing clash at ${k}`);
        const [r, c] = k.split(",").map(Number);
        if (r >= p.rows || c >= p.cols) throw new Error(`${p.key}: ${w.answer} out of bounds`);
      }
    const all = Object.values(sol).join("") + EXTRAS;
    for (const b of p.bonus) if (!canSpell(all, b)) throw new Error(`${p.key}: bonus ${b} not spellable`);
    if (p.bonus.some((b) => b.length > RACK_SIZE)) throw new Error(`${p.key}: bonus word longer than a rack`);
    console.log(p.key, "ok:", Object.keys(sol).length, "cells,", freshBag(p).length, "tiles in bag");
  }
}

/** What the browser gets: clues and geometry, never the answers. */
export type PublicWord = { clue: string; row: number; col: number; dir: "a" | "d"; len: number };
export type PublicPuzzle = { key: string; rows: number; cols: number; words: PublicWord[]; bonus: string[] };
export const publicPuzzle = (p: Puzzle): PublicPuzzle => ({
  key: p.key, rows: p.rows, cols: p.cols, bonus: p.bonus,
  words: p.words.map(({ clue, row, col, dir, answer }) => ({ clue, row, col, dir, len: answer.length })),
});
export const publicCells = (w: PublicWord) =>
  Array.from({ length: w.len }, (_, i) => cellKey(w.row + (w.dir === "d" ? i : 0), w.col + (w.dir === "a" ? i : 0)));
