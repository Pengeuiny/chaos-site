import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminTabs from "@/app/admin/AdminTabs";
import BudgetSeasonPanel from "@/app/admin/BudgetSeasonPanel";
import BudgetCategoriesPanel from "@/app/admin/BudgetCategoriesPanel";
import { allocateOverhead, fmtMoney, showFinancials, thresholdWarnings } from "@/lib/budget";
import type { BudgetCategory, BudgetLineItem, BudgetRevenueLine, BudgetSeason } from "@/lib/types";
import styles from "../../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Budget · CHS CHAOS Admin" };

type LineItemRow = BudgetLineItem & { budget_expenses: { amount: number; status: string }[] };
type ProductionRow = { id: string; title: string; starts_on: string | null; sort_order: number };

const OK: Record<string, string> = {
  season_added: "Season created.",
  season_updated: "Settings saved.",
  season_activated: "Active season switched.",
  season_deleted: "Season deleted.",
  category_added: "Category added.",
  category_renamed: "Category renamed.",
  category_deleted: "Category deleted.",
};
const ERR: Record<string, string> = {
  nodb: "Supabase service-role key isn't configured (SUPABASE_SERVICE_ROLE_KEY).",
  name: "A season name is required.",
  category: "A category name is required.",
  save: "Could not save.",
};

export default async function BudgetDashboard({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const me = await requireAdmin();
  const canEdit = me.role === "admin" || me.role === "treasurer";
  const { ok, error } = await searchParams;
  const admin = createAdminClient();

  let seasons: BudgetSeason[] = [];
  let productions: ProductionRow[] = [];
  let lineItems: LineItemRow[] = [];
  let revenueLines: BudgetRevenueLine[] = [];
  let categories: BudgetCategory[] = [];

  if (admin) {
    const [seasonsRes, productionsRes, categoriesRes] = await Promise.all([
      admin.from("budget_seasons").select("*").order("created_at", { ascending: false }),
      admin.from("productions").select("id, title, starts_on, sort_order").order("sort_order", { ascending: true }),
      admin.from("budget_categories").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
    ]);
    seasons = (seasonsRes.data as BudgetSeason[] | null) ?? [];
    productions = (productionsRes.data as ProductionRow[] | null) ?? [];
    categories = (categoriesRes.data as BudgetCategory[] | null) ?? [];

    const activeSeason = seasons.find((s) => s.is_active) ?? null;
    if (activeSeason) {
      const [lineItemsRes, revenueRes] = await Promise.all([
        admin
          .from("budget_line_items")
          .select("*, budget_expenses(amount, status)")
          .eq("season_id", activeSeason.id),
        admin.from("budget_revenue_lines").select("*").eq("season_id", activeSeason.id),
      ]);
      lineItems = (lineItemsRes.data as LineItemRow[] | null) ?? [];
      revenueLines = (revenueRes.data as BudgetRevenueLine[] | null) ?? [];
    }
  }

  const activeSeason = seasons.find((s) => s.is_active) ?? null;

  const totalsFor = (items: LineItemRow[]) => {
    const budgeted = items.reduce((s, l) => s + l.budgeted_amount, 0);
    let committed = 0;
    let paid = 0;
    for (const l of items) {
      for (const e of l.budget_expenses) {
        if (e.status === "paid") paid += e.amount;
        else committed += e.amount;
      }
    }
    return { budgeted, committed, paid };
  };

  const showItems = lineItems.filter((l) => l.scope === "show");
  const overheadItems = lineItems.filter((l) => l.scope === "overhead");
  const tripItems = lineItems.filter((l) => l.scope === "trip");

  const overheadTotals = totalsFor(overheadItems);
  const tripTotals = totalsFor(tripItems);
  const seasonTotals = totalsFor(lineItems);

  const shows = productions.map((p) => {
    const items = showItems.filter((l) => l.production_id === p.id);
    const t = totalsFor(items);
    return { ...p, ...t };
  });

  const overheadShares = allocateOverhead(
    activeSeason?.overhead_allocation_method ?? "percent_of_direct",
    shows.map((s) => ({ production_id: s.id, directTotal: s.budgeted })),
    overheadTotals.budgeted,
  );

  const showFinancialsById = new Map(
    shows.map((s) => [
      s.id,
      showFinancials({
        directBudgeted: s.budgeted,
        overheadShare: overheadShares[s.id] ?? 0,
        committed: s.committed,
        paid: s.paid,
        revenueLines: revenueLines.filter((r) => r.production_id === s.id),
      }),
    ]),
  );

  const totalRevenueProjected = revenueLines.reduce((s, l) => s + l.projected_amount, 0);
  const totalRevenueActual = revenueLines.reduce((s, l) => s + (l.actual_amount ?? l.projected_amount), 0);
  const gap = seasonTotals.budgeted - totalRevenueActual;

  const warnings = activeSeason
    ? thresholdWarnings({
        season: activeSeason,
        totalOverhead: overheadTotals.budgeted,
        totalSeasonBudget: seasonTotals.budgeted,
        revenueLines,
        shows: shows.map((s) => ({
          title: s.title,
          starts_on: s.starts_on,
          budgeted: s.budgeted + (overheadShares[s.id] ?? 0),
          committedAndPaid: s.committed + s.paid,
        })),
      })
    : [];

  return (
    <>
      <h1 className={styles.h1}>Dashboard</h1>
      <AdminTabs active="budget" role={me.role} />

      {ok && OK[ok] && <div className={styles.ok}>{OK[ok]}</div>}
      {error && <div className={styles.error}>{ERR[error] ?? "Something went wrong."}</div>}
      {!admin && (
        <div className={styles.error}>
          Not connected to Supabase. Set <code>NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          and <code>SUPABASE_SERVICE_ROLE_KEY</code> in the environment.
        </div>
      )}

      <section className={styles.card} style={{ maxWidth: 820, marginBottom: 20 }}>
        <h2 className={styles.h2}>Seasons</h2>
        <BudgetSeasonPanel seasons={seasons} activeSeason={activeSeason} canEdit={canEdit} />
      </section>

      <section className={styles.card} style={{ maxWidth: 820, marginBottom: 20 }}>
        <h2 className={styles.h2}>Categories</h2>
        <BudgetCategoriesPanel categories={categories} canEdit={canEdit} />
      </section>

      {activeSeason && (
        <>
          <section className={styles.card} style={{ maxWidth: 820, marginBottom: 20 }}>
            <h2 className={styles.h2}>{activeSeason.name} summary</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <tbody>
                {[
                  ["Total budgeted", fmtMoney(seasonTotals.budgeted)],
                  ["Committed", fmtMoney(seasonTotals.committed)],
                  ["Paid", fmtMoney(seasonTotals.paid)],
                  ["Revenue projected", fmtMoney(totalRevenueProjected)],
                  ["Revenue actual (where entered)", fmtMoney(totalRevenueActual)],
                  ["Overhead", fmtMoney(overheadTotals.budgeted)],
                  ["Chorus trip", fmtMoney(tripTotals.budgeted)],
                  [
                    "Reserve balance",
                    activeSeason.current_reserve_balance != null
                      ? fmtMoney(activeSeason.current_reserve_balance)
                      : "not entered",
                  ],
                ].map(([label, value]) => (
                  <tr key={label} style={{ borderTop: "1px solid rgba(233,185,73,.15)" }}>
                    <td style={{ padding: "8px 0", color: "#e3d9c6" }}>{label}</td>
                    <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 700, color: "#f0c66b" }}>
                      {value}
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid rgba(233,185,73,.35)" }}>
                  <td style={{ padding: "10px 0", fontWeight: 700 }}>
                    {gap > 0 ? "Fundraising gap" : "Projected surplus"}
                  </td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 700, fontSize: 16 }}>
                    {fmtMoney(Math.abs(gap))}
                  </td>
                </tr>
              </tbody>
            </table>

            {warnings.length > 0 && (
              <div style={{ marginTop: 14 }}>
                {warnings.map((w, i) => (
                  <div key={i} className={styles.error} style={{ marginBottom: 8 }}>
                    {w.message}
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className={styles.rowActions} style={{ marginBottom: 20 }}>
            <Link className={styles.editLink} href="/admin/budget/overhead">Overhead</Link>
            <Link className={styles.editLink} href="/admin/budget/trip">Chorus trip</Link>
            <Link className={styles.editLink} href="/admin/budget/revenue">Revenue</Link>
          </div>

          <section className={styles.card} style={{ maxWidth: 820 }}>
            <h2 className={styles.h2}>Shows</h2>
            <p className={styles.muted} style={{ marginTop: -6, marginBottom: 14 }}>
              &ldquo;Net&rdquo; below only counts revenue tied to that specific show (e.g. its own
              ticket sales) — season-wide revenue like donations or grants is in the season summary
              above, not repeated per show.
            </p>
            {shows.length === 0 ? (
              <p className={styles.muted}>No shows yet — add one from the Shows tab first.</p>
            ) : (
              <ul className={styles.showList}>
                {shows.map((s) => {
                  const fin = showFinancialsById.get(s.id)!;
                  return (
                    <li key={s.id} className={styles.showItem}>
                      <div className={styles.showHead}>
                        <div>
                          <strong>{s.title}</strong>
                          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 4, fontSize: 13.5 }}>
                            {[
                              ["Cost (direct + overhead)", fmtMoney(fin.totalCost)],
                              ["Committed + paid", fmtMoney(fin.committed + fin.paid)],
                              ["Show revenue", fmtMoney(fin.showRevenueActual)],
                            ].map(([label, value]) => (
                              <span key={label}>
                                <span className={styles.muted}>{label}: </span>
                                <span style={{ fontWeight: 700 }}>{value}</span>
                              </span>
                            ))}
                            <span>
                              <span className={styles.muted}>Net: </span>
                              <span style={{ fontWeight: 700, color: fin.netActual >= 0 ? "#7fd992" : "#e07a7a" }}>
                                {fin.netActual >= 0 ? "+" : "−"}
                                {fmtMoney(Math.abs(fin.netActual))}
                              </span>
                            </span>
                          </div>
                        </div>
                        <Link className={styles.editLink} href={`/admin/budget/shows/${s.id}`}>
                          Manage
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
