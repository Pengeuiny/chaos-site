import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminTabs from "@/app/admin/AdminTabs";
import BudgetLineItemsSection from "@/app/admin/BudgetLineItemsSection";
import { allocateOverhead, fmtMoney } from "@/lib/budget";
import type { BudgetCategory, BudgetExpense, BudgetLineItem, BudgetSeason } from "@/lib/types";
import styles from "../../../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Overhead · CHS CHAOS Admin" };

type LineItemWithExpenses = BudgetLineItem & { budget_expenses: BudgetExpense[] };
type ProductionRow = { id: string; title: string };

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
  save: "Could not save.",
};

export default async function OverheadBudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const me = await requireAdmin();
  const canEdit = me.role === "admin" || me.role === "treasurer";
  const { ok, error } = await searchParams;
  const admin = createAdminClient();
  if (!admin) {
    return (
      <div className={styles.error}>
        Not connected to Supabase (SUPABASE_SERVICE_ROLE_KEY).
      </div>
    );
  }

  const [{ data: seasonsData }, { data: categoriesData }] = await Promise.all([
    admin.from("budget_seasons").select("*").order("created_at", { ascending: false }),
    admin.from("budget_categories").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
  ]);
  const seasons = (seasonsData as BudgetSeason[] | null) ?? [];
  const activeSeason = seasons.find((s) => s.is_active) ?? null;
  const categories = ((categoriesData as BudgetCategory[] | null) ?? []).map((c) => c.name);

  let overheadItems: LineItemWithExpenses[] = [];
  let showAllocation: { title: string; share: number }[] = [];

  if (activeSeason) {
    const [{ data: itemsData }, { data: productionsData }, { data: showItemsData }] = await Promise.all([
      admin
        .from("budget_line_items")
        .select("*, budget_expenses(*)")
        .eq("season_id", activeSeason.id)
        .eq("scope", "overhead")
        .order("sort_order", { ascending: true }),
      admin.from("productions").select("id, title").order("sort_order", { ascending: true }),
      admin
        .from("budget_line_items")
        .select("production_id, budgeted_amount")
        .eq("season_id", activeSeason.id)
        .eq("scope", "show"),
    ]);
    overheadItems = (itemsData as LineItemWithExpenses[] | null) ?? [];
    const productions = (productionsData as ProductionRow[] | null) ?? [];
    const showItems = (showItemsData as { production_id: string; budgeted_amount: number }[] | null) ?? [];

    const overheadTotal = overheadItems.reduce((s, l) => s + l.budgeted_amount, 0);
    const directTotals = productions.map((p) => ({
      production_id: p.id,
      directTotal: showItems.filter((l) => l.production_id === p.id).reduce((s, l) => s + l.budgeted_amount, 0),
    }));
    const shares = allocateOverhead(activeSeason.overhead_allocation_method, directTotals, overheadTotal);
    showAllocation = productions.map((p) => ({ title: p.title, share: shares[p.id] ?? 0 }));
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

      <section className={styles.card} style={{ maxWidth: 820 }}>
        <h2 className={styles.h2}>Overhead / G&amp;A</h2>
        {!activeSeason ? (
          <p className={styles.muted}>No active budget season — create one on the Budget tab first.</p>
        ) : (
          <>
            <BudgetLineItemsSection
              lineItems={overheadItems}
              seasonId={activeSeason.id}
              scope="overhead"
              dualSignatureThreshold={activeSeason.dual_signature_threshold}
              contingencyDefaultPercent={activeSeason.contingency_default_percent}
              categories={categories}
              canEdit={canEdit}
              isApproved={activeSeason.status === "approved"}
            />

            {showAllocation.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h3 style={{ fontSize: 15, color: "#e3d9c6", margin: "0 0 8px" }}>
                  Allocation preview ({activeSeason.overhead_allocation_method.replace(/_/g, " ")})
                </h3>
                <ul className={styles.muted} style={{ margin: 0, paddingLeft: 18 }}>
                  {showAllocation.map((s) => (
                    <li key={s.title}>{s.title}: {fmtMoney(s.share)}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
