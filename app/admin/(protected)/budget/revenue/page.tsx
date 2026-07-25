import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminTabs from "@/app/admin/AdminTabs";
import BudgetRevenueSection from "@/app/admin/BudgetRevenueSection";
import type { BudgetRevenueLine, BudgetSeason } from "@/lib/types";
import styles from "../../../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Revenue · CHS CHAOS Admin" };

type ProductionRow = { id: string; title: string };

const OK: Record<string, string> = {
  revenue_added: "Revenue line added.",
  revenue_updated: "Revenue line updated.",
  revenue_deleted: "Revenue line deleted.",
};
const ERR: Record<string, string> = {
  nodb: "Supabase service-role key isn't configured (SUPABASE_SERVICE_ROLE_KEY).",
  season: "No active budget season — create one on the Budget tab first.",
  source: "A revenue source is required.",
  save: "Could not save.",
};

export default async function RevenueBudgetPage({
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

  const { data: seasonsData } = await admin
    .from("budget_seasons")
    .select("*")
    .order("created_at", { ascending: false });
  const seasons = (seasonsData as BudgetSeason[] | null) ?? [];
  const activeSeason = seasons.find((s) => s.is_active) ?? null;

  let revenueLines: BudgetRevenueLine[] = [];
  let productions: ProductionRow[] = [];
  if (activeSeason) {
    const [{ data: revenueData }, { data: productionsData }] = await Promise.all([
      admin
        .from("budget_revenue_lines")
        .select("*")
        .eq("season_id", activeSeason.id)
        .order("sort_order", { ascending: true }),
      admin.from("productions").select("id, title").order("sort_order", { ascending: true }),
    ]);
    revenueLines = (revenueData as BudgetRevenueLine[] | null) ?? [];
    productions = (productionsData as ProductionRow[] | null) ?? [];
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
        <h2 className={styles.h2}>Revenue</h2>
        {!activeSeason ? (
          <p className={styles.muted}>No active budget season — create one on the Budget tab first.</p>
        ) : (
          <BudgetRevenueSection
            revenueLines={revenueLines}
            seasonId={activeSeason.id}
            productions={productions}
            canEdit={canEdit}
            isApproved={activeSeason.status === "approved"}
          />
        )}
      </section>
    </>
  );
}
