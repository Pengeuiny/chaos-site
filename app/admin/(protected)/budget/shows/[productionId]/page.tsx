import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminTabs from "@/app/admin/AdminTabs";
import BudgetLineItemsSection from "@/app/admin/BudgetLineItemsSection";
import { allocateOverhead, fmtMoney, showFinancials } from "@/lib/budget";
import type { BudgetCategory, BudgetExpense, BudgetLineItem, BudgetRevenueLine, BudgetSeason } from "@/lib/types";
import styles from "../../../../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Show budget · CHS CHAOS Admin" };

type LineItemWithExpenses = BudgetLineItem & { budget_expenses: BudgetExpense[] };

const OK: Record<string, string> = {
  line_added: "Line item added.",
  line_updated: "Line item updated.",
  line_deleted: "Line item deleted.",
  expense_added: "Expense logged.",
  expense_updated: "Expense updated.",
  expense_deleted: "Expense deleted.",
};
const ERR: Record<string, string> = {
  nodb: "Supabase service-role key isn't configured (SUPABASE_SERVICE_ROLE_KEY).",
  season: "No active budget season — create one on the Budget tab first.",
  category: "A category is required.",
  show: "Missing show.",
  save: "Could not save.",
};

export default async function ShowBudgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ productionId: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const me = await requireAdmin();
  const canEdit = me.role === "admin" || me.role === "treasurer";
  const { productionId } = await params;
  const { ok, error } = await searchParams;
  const admin = createAdminClient();
  if (!admin) {
    return (
      <div className={styles.error}>
        Not connected to Supabase (SUPABASE_SERVICE_ROLE_KEY).
      </div>
    );
  }

  const [{ data: production }, { data: seasonsData }, { data: categoriesData }] = await Promise.all([
    admin.from("productions").select("id, title").eq("id", productionId).single(),
    admin.from("budget_seasons").select("*").order("created_at", { ascending: false }),
    admin.from("budget_categories").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
  ]);
  if (!production) notFound();

  const seasons = (seasonsData as BudgetSeason[] | null) ?? [];
  const activeSeason = seasons.find((s) => s.is_active) ?? null;
  const categories = ((categoriesData as BudgetCategory[] | null) ?? []).map((c) => c.name);

  let lineItems: LineItemWithExpenses[] = [];
  let fin: ReturnType<typeof showFinancials> | null = null;

  if (activeSeason) {
    const [{ data }, { data: allShowItemsData }, { data: overheadItemsData }, { data: allProductionsData }, { data: revenueData }] =
      await Promise.all([
        admin
          .from("budget_line_items")
          .select("*, budget_expenses(*)")
          .eq("season_id", activeSeason.id)
          .eq("production_id", productionId)
          .order("sort_order", { ascending: true }),
        admin
          .from("budget_line_items")
          .select("production_id, budgeted_amount")
          .eq("season_id", activeSeason.id)
          .eq("scope", "show"),
        admin
          .from("budget_line_items")
          .select("budgeted_amount")
          .eq("season_id", activeSeason.id)
          .eq("scope", "overhead"),
        admin.from("productions").select("id"),
        admin
          .from("budget_revenue_lines")
          .select("*")
          .eq("season_id", activeSeason.id)
          .eq("production_id", productionId)
          .order("sort_order", { ascending: true }),
      ]);
    lineItems = (data as LineItemWithExpenses[] | null) ?? [];

    const allShowItems = (allShowItemsData as { production_id: string | null; budgeted_amount: number }[] | null) ?? [];
    const overheadItems = (overheadItemsData as { budgeted_amount: number }[] | null) ?? [];
    const allProductions = (allProductionsData as { id: string }[] | null) ?? [];
    const revenueLines = (revenueData as BudgetRevenueLine[] | null) ?? [];

    const overheadTotal = overheadItems.reduce((s, l) => s + l.budgeted_amount, 0);
    const directTotals = allProductions.map((p) => ({
      production_id: p.id,
      directTotal: allShowItems.filter((l) => l.production_id === p.id).reduce((s, l) => s + l.budgeted_amount, 0),
    }));
    const shares = allocateOverhead(activeSeason.overhead_allocation_method, directTotals, overheadTotal);

    let committed = 0;
    let paid = 0;
    for (const l of lineItems) {
      for (const e of l.budget_expenses) {
        if (e.status === "paid") paid += e.amount;
        else committed += e.amount;
      }
    }

    fin = showFinancials({
      directBudgeted: lineItems.reduce((s, l) => s + l.budgeted_amount, 0),
      overheadShare: shares[productionId] ?? 0,
      committed,
      paid,
      revenueLines,
    });
  }

  return (
    <>
      <h1 className={styles.h1}>Dashboard</h1>
      <AdminTabs active="budget" role={me.role} />
      <div style={{ marginBottom: 18 }}>
        <Link className={styles.topLink} href="/admin/budget">← Back to Budget</Link>
      </div>

      {ok && OK[ok] && <div className={styles.ok}>{OK[ok]}</div>}
      {error && <div className={styles.error}>{ERR[error] ?? "Something went wrong."}</div>}

      {activeSeason && fin && (
        <section className={styles.card} style={{ maxWidth: 820, marginBottom: 20 }}>
          <h2 className={styles.h2}>Cost vs. revenue</h2>
          <p className={styles.muted} style={{ marginTop: -6, marginBottom: 12 }}>
            Revenue here is only what&rsquo;s tied to this show specifically — season-wide revenue
            (donations, grants, etc.) isn&rsquo;t counted per show, see the Season summary instead.
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <tbody>
              {[
                ["Direct budget", fmtMoney(fin.directBudgeted)],
                ["Overhead share", fmtMoney(fin.overheadShare)],
                ["Total cost", fmtMoney(fin.totalCost)],
                ["Committed", fmtMoney(fin.committed)],
                ["Paid", fmtMoney(fin.paid)],
                ["Show revenue projected", fmtMoney(fin.showRevenueProjected)],
                ["Show revenue actual (where entered)", fmtMoney(fin.showRevenueActual)],
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
                  {fin.netActual >= 0 ? "Net (actual)" : "Shortfall (actual)"}
                </td>
                <td
                  style={{
                    padding: "10px 0",
                    textAlign: "right",
                    fontWeight: 700,
                    fontSize: 16,
                    color: fin.netActual >= 0 ? "#7fd992" : "#e07a7a",
                  }}
                >
                  {fin.netActual >= 0 ? "+" : "−"}
                  {fmtMoney(Math.abs(fin.netActual))}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      <section className={styles.card} style={{ maxWidth: 820 }}>
        <h2 className={styles.h2}>{production.title}</h2>
        {!activeSeason ? (
          <p className={styles.muted}>No active budget season — create one on the Budget tab first.</p>
        ) : (
          <BudgetLineItemsSection
            lineItems={lineItems}
            seasonId={activeSeason.id}
            scope="show"
            productionId={production.id}
            dualSignatureThreshold={activeSeason.dual_signature_threshold}
            contingencyDefaultPercent={activeSeason.contingency_default_percent}
            categories={categories}
            canEdit={canEdit}
            isApproved={activeSeason.status === "approved"}
          />
        )}
      </section>
    </>
  );
}
