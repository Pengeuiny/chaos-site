// When a lobby game is playable. Pure, so server actions and the client board agree.
// A performance's game runs its whole Eastern show day, paused from curtain until
// 90 minutes later (7pm–8:30pm for a 7pm show). Rehearsals have no curtain.

export const REOPEN_AFTER_MS = 90 * 60 * 1000;

type Win = { opens_at: string; closes_at: string; curtain_at?: string | null };

const pause = (s: Win) => {
  const c = s.curtain_at ? Date.parse(s.curtain_at) : null;
  return c === null ? null : ([c, c + REOPEN_AFTER_MS] as const);
};

/** Inside the show-time pause (and the game hasn't closed for the night). */
export function isPaused(s: Win, now: number) {
  const p = pause(s);
  return !!p && p[0] <= now && now < p[1] && now < Date.parse(s.closes_at);
}

export function isLive(s: Win, now: number) {
  return Date.parse(s.opens_at) <= now && now < Date.parse(s.closes_at) && !isPaused(s, now);
}

/** When play resumes after the curtain, or null for a rehearsal. */
export const reopensAt = (s: Win) => pause(s)?.[1] ?? null;

/** Next instant isLive can flip, so the client knows when to refresh. */
export function nextBoundary(s: Win, now: number) {
  const p = pause(s);
  const ts = [Date.parse(s.opens_at), p?.[0], p?.[1], Date.parse(s.closes_at)];
  return ts.filter((t): t is number => t !== undefined && t > now).sort((a, b) => a - b)[0] ?? null;
}
