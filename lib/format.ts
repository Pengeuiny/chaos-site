// Event dates are anchored to the school's local timezone (Eastern) so the
// displayed day/time never drifts based on where the visitor (or server) is.
const TZ = "America/New_York";

export const MON = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Calendar-relevant parts of a timestamp, evaluated in the event timezone. */
export function parts(iso: string) {
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    weekday: "short",
    hour12: true,
  });
  const map: Record<string, string> = {};
  for (const p of f.formatToParts(d)) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month) - 1, // 0-indexed
    day: Number(map.day),
    weekday: map.weekday, // "Mon"
    hour: map.hour,
    minute: map.minute,
    dayPeriod: (map.dayPeriod || "").toUpperCase(),
  };
}

export function fmtTime(iso: string) {
  const p = parts(iso);
  return `${p.hour}:${p.minute} ${p.dayPeriod}`;
}

export function fmtDay(iso: string) {
  const p = parts(iso);
  return `${MON[p.month]} ${p.day}, ${p.year}`;
}

export function initials(name: string) {
  return name
    .split(/\s|&/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * Convert an admin's `datetime-local` value ("YYYY-MM-DDTHH:MM"), interpreted
 * as Eastern wall-clock time, into a UTC ISO string for storage. Display code
 * formats it back in America/New_York, so the entered time round-trips exactly.
 */
export function easternWallToUtcIso(local: string): string {
  const [datePart, timePart] = local.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi] = (timePart || "00:00").split(":").map(Number);

  const offsetMinutes = (instant: number) => {
    const f = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const p: Record<string, string> = {};
    for (const part of f.formatToParts(new Date(instant))) p[part.type] = part.value;
    const asUTC = Date.UTC(
      +p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second,
    );
    return (asUTC - instant) / 60000;
  };

  const wall = Date.UTC(y, mo - 1, d, h, mi);
  // Two passes settle the offset correctly even across DST boundaries.
  let off = offsetMinutes(wall);
  off = offsetMinutes(wall - off * 60000);
  return new Date(wall - off * 60000).toISOString();
}

/** The inverse of easternWallToUtcIso — for pre-filling an edit form's `datetime-local` input. */
export function toEasternLocalInput(iso: string): string {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of f.formatToParts(new Date(iso))) p[part.type] = part.value;
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** month index (1-12) -> season name, using a school-calendar-ish split. */
const SEASON_BY_MONTH = [
  "Winter", "Winter", "Spring", "Spring", "Spring", "Summer",
  "Summer", "Summer", "Fall", "Fall", "Fall", "Winter",
];

function seasonLabel(dateStr: string): string {
  const [year, month] = dateStr.split("-").map(Number);
  return `${SEASON_BY_MONTH[month - 1]} ${year}`;
}

/** Format a start/end pair of "YYYY-MM-DD" strings as a human date range. */
export function fmtDateRange(startStr: string, endStr: string): string {
  const [sy, sm, sd] = startStr.split("-").map(Number);
  const [ey, em, ed] = endStr.split("-").map(Number);
  if (sy === ey && sm === em && sd === ed) return `${MON[sm - 1]} ${sd}, ${sy}`;
  if (sy === ey && sm === em) return `${MON[sm - 1]} ${sd}–${ed}, ${sy}`;
  if (sy === ey) return `${MON[sm - 1]} ${sd} – ${MON[em - 1]} ${ed}, ${sy}`;
  return `${MON[sm - 1]} ${sd}, ${sy} – ${MON[em - 1]} ${ed}, ${ey}`;
}

export type ShowStatus = {
  tagText: string;
  tagClass: "onsale" | "upcoming" | "past" | "tbd";
  dateLabel: string;
};

/**
 * A show's date range, more than ~2 months out, reads better as a season
 * ("Fall 2026") than exact dates nobody will remember yet. Inside that
 * window (or already running) it shows exact dates and reads as On Sale.
 * This is computed fresh on every render, so — unlike a manually-set tag —
 * it can never go stale (e.g. a past show still showing "On Sale").
 *
 * Three tiers of fidelity, highest first:
 *  1. Known performances (showtimes already entered in the Events tab —
 *     inherently supports multiple dates/times, including two shows the
 *     same day) — the real min/max of those wins over everything else.
 *  2. A manually entered starts_on/ends_on range, for when the run dates
 *     are known but individual performances haven't been scheduled yet.
 *  3. dates_tbd — nothing is locked in; show the free-text date_range as-is.
 */
const SEASON_CUTOFF_DAYS = 60;

export function characterizeShow(
  p: {
    starts_on: string | null;
    ends_on: string | null;
    dates_tbd: boolean;
    date_range: string | null;
    showtimes?: { starts_at: string | null }[];
  },
  now: string = new Date().toISOString().slice(0, 10),
): ShowStatus {
  const knownDates = (p.showtimes ?? [])
    .map((s) => s.starts_at)
    .filter((s): s is string => Boolean(s))
    .map((s) => s.slice(0, 10))
    .sort();

  let start: string;
  let end: string;

  if (knownDates.length > 0) {
    start = knownDates[0];
    end = knownDates[knownDates.length - 1];
  } else if (p.dates_tbd || !p.starts_on) {
    return {
      tagText: "Coming Soon",
      tagClass: "tbd",
      dateLabel: p.date_range || "Coming soon",
    };
  } else {
    start = p.starts_on;
    end = p.ends_on || p.starts_on;
  }

  const dateLabel = fmtDateRange(start, end);

  if (end < now) return { tagText: "Past", tagClass: "past", dateLabel };

  const daysToStart = (Date.parse(start) - Date.parse(now)) / 86400000;
  if (start <= now || daysToStart <= SEASON_CUTOFF_DAYS) {
    return { tagText: "On Sale", tagClass: "onsale", dateLabel };
  }

  return { tagText: seasonLabel(start), tagClass: "upcoming", dateLabel: seasonLabel(start) };
}
