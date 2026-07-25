// Budget business logic — pure functions, no DB calls. Implements the
// framework in docs/theater-budget.md: overhead allocation, break-even
// ticket pricing, revenue diversification, contingency sizing, and the
// doc's "thresholds that would change the plan."

import type {
  BudgetRevenueSourceType,
  BudgetSeason,
  OverheadAllocationMethod,
} from "./types";

export function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/**
 * Spread the season's overhead across shows under one of three rules
 * (docs/theater-budget.md §3). Falls back to an equal split if the chosen
 * method's basis (direct cost / participant count) isn't available yet.
 */
export function allocateOverhead(
  method: OverheadAllocationMethod,
  shows: { production_id: string; directTotal: number; participantCount?: number }[],
  overheadTotal: number,
): Record<string, number> {
  const shares: Record<string, number> = {};
  if (shows.length === 0) return shares;

  const equalSplit = () => {
    const per = overheadTotal / shows.length;
    for (const s of shows) shares[s.production_id] = per;
    return shares;
  };

  if (method === "equal") return equalSplit();

  if (method === "participants") {
    const totalParticipants = shows.reduce((sum, s) => sum + (s.participantCount ?? 0), 0);
    if (totalParticipants <= 0) return equalSplit();
    for (const s of shows) {
      shares[s.production_id] = overheadTotal * ((s.participantCount ?? 0) / totalParticipants);
    }
    return shares;
  }

  // percent_of_direct (default) — bigger shows absorb more overhead
  const totalDirect = shows.reduce((sum, s) => sum + s.directTotal, 0);
  if (totalDirect <= 0) return equalSplit();
  for (const s of shows) {
    shares[s.production_id] = overheadTotal * (s.directTotal / totalDirect);
  }
  return shares;
}

/** Break-even seats = fixed costs ÷ (ticket price − variable cost per attendee). §4 */
export function breakEven({
  fixedCosts,
  ticketPrice,
  variableCostPerAttendee,
}: {
  fixedCosts: number;
  ticketPrice: number;
  variableCostPerAttendee: number;
}): { seatsNeeded: number | null; error?: string } {
  const contribution = ticketPrice - variableCostPerAttendee;
  if (contribution <= 0) {
    return { seatsNeeded: null, error: "Ticket price must exceed the variable cost per attendee." };
  }
  return { seatsNeeded: Math.ceil(fixedCosts / contribution) };
}

const CONCENTRATION_WARNING_PCT = 30;

export type RevenueStreamShare = {
  source_type: BudgetRevenueSourceType;
  amount: number;
  percentOfTotal: number;
  overConcentrated: boolean;
};

/** No single revenue stream should be more than ~25-30% of the total. §5 */
export function revenueDiversification(
  lines: { source_type: BudgetRevenueSourceType; projected_amount: number; actual_amount: number | null }[],
): { streams: RevenueStreamShare[]; total: number } {
  const bySource = new Map<BudgetRevenueSourceType, number>();
  for (const l of lines) {
    const amt = l.actual_amount ?? l.projected_amount;
    bySource.set(l.source_type, (bySource.get(l.source_type) ?? 0) + amt);
  }
  const total = [...bySource.values()].reduce((a, b) => a + b, 0);
  const streams: RevenueStreamShare[] = [...bySource.entries()].map(([source_type, amount]) => {
    const percentOfTotal = total > 0 ? (amount / total) * 100 : 0;
    return {
      source_type,
      amount,
      percentOfTotal,
      overConcentrated: percentOfTotal > CONCENTRATION_WARNING_PCT,
    };
  });
  return { streams, total };
}

export type ContingencyCheckResult = {
  contingencyAmount: number;
  otherLinesTotal: number;
  percentOfOtherLines: number | null;
  withinRecommendedRange: boolean;
};

/** Standard practice is a 10-15% contingency against the rest of a show's budget. §7 */
export function contingencyCheck(
  lineItems: { budgeted_amount: number; is_contingency: boolean }[],
): ContingencyCheckResult {
  const contingencyAmount = lineItems
    .filter((l) => l.is_contingency)
    .reduce((s, l) => s + l.budgeted_amount, 0);
  const otherLinesTotal = lineItems
    .filter((l) => !l.is_contingency)
    .reduce((s, l) => s + l.budgeted_amount, 0);
  const percentOfOtherLines = otherLinesTotal > 0 ? (contingencyAmount / otherLinesTotal) * 100 : null;
  return {
    contingencyAmount,
    otherLinesTotal,
    percentOfOtherLines,
    withinRecommendedRange:
      percentOfOtherLines !== null && percentOfOtherLines >= 10 && percentOfOtherLines <= 15,
  };
}

export type ThresholdWarning = {
  type: "revenue_concentration" | "overhead_range" | "show_near_budget" | "reserve_low";
  message: string;
};

/** The doc's "Thresholds that would change the plan" — computed fresh, never stale. */
export function thresholdWarnings({
  season,
  totalOverhead,
  totalSeasonBudget,
  revenueLines,
  shows,
}: {
  season: BudgetSeason;
  totalOverhead: number;
  totalSeasonBudget: number;
  revenueLines: {
    source_type: BudgetRevenueSourceType;
    projected_amount: number;
    actual_amount: number | null;
  }[];
  shows: { title: string; starts_on: string | null; budgeted: number; committedAndPaid: number }[];
}): ThresholdWarning[] {
  const warnings: ThresholdWarning[] = [];

  const { streams } = revenueDiversification(revenueLines);
  for (const s of streams) {
    if (s.overConcentrated) {
      warnings.push({
        type: "revenue_concentration",
        message: `${s.source_type.replace(/_/g, " ")} is ${s.percentOfTotal.toFixed(0)}% of projected revenue — no stream should be much above ~30%.`,
      });
    }
  }

  if (totalSeasonBudget > 0) {
    const overheadPct = (totalOverhead / totalSeasonBudget) * 100;
    if (overheadPct > 35) {
      warnings.push({
        type: "overhead_range",
        message: `Overhead is ${overheadPct.toFixed(0)}% of total spending — above the healthy 20-35% range. Review shared costs.`,
      });
    } else if (overheadPct < 15) {
      warnings.push({
        type: "overhead_range",
        message: `Overhead is only ${overheadPct.toFixed(0)}% of total spending — check you're not under-funding insurance, storage, or software.`,
      });
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  for (const show of shows) {
    if (show.budgeted <= 0) continue;
    const ratio = show.committedAndPaid / show.budgeted;
    const opensLater = !show.starts_on || show.starts_on > today;
    if (opensLater && ratio >= 0.85) {
      warnings.push({
        type: "show_near_budget",
        message: `${show.title} has committed/paid ${(ratio * 100).toFixed(0)}% of its budget before opening — freeze non-essential spending.`,
      });
    }
  }

  if (season.current_reserve_balance != null && totalSeasonBudget > 0) {
    const monthlyOperating = totalSeasonBudget / 12;
    const targetReserve = monthlyOperating * season.reserve_target_months;
    if (season.current_reserve_balance < targetReserve) {
      warnings.push({
        type: "reserve_low",
        message: `Reserve balance (${fmtMoney(season.current_reserve_balance)}) is below the ${season.reserve_target_months}-month target (${fmtMoney(targetReserve)}). Direct year-end surplus to rebuild it.`,
      });
    }
  }

  return warnings;
}
