import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminTabs from "@/app/admin/AdminTabs";
import BudgetLineItemsSection from "@/app/admin/BudgetLineItemsSection";
import type { BudgetExpense, BudgetLineItem, BudgetSeason } from "@/lib/types";
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

  const [{ data: production }, { data: seasonsData }] = await Promise.all([
    admin.from("productions").select("id, title").eq("id", productionId).single(),
    admin.from("budget_seasons").select("*").order("created_at", { ascending: false }),
  ]);
  if (!production) notFound();

  const seasons = (seasonsData as BudgetSeason[] | null) ?? [];
  const activeSeason = seasons.find((s) => s.is_active) ?? null;

  let lineItems: LineItemWithExpenses[] = [];
  if (activeSeason) {
    const { data } = await admin
      .from("budget_line_items")
      .select("*, budget_expenses(*)")
      .eq("season_id", activeSeason.id)
      .eq("production_id", productionId)
      .order("sort_order", { ascending: true });
    lineItems = (data as LineItemWithExpenses[] | null) ?? [];
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
            canEdit={canEdit}
          />
        )}
      </section>
    </>
  );
}
