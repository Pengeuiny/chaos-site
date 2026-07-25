import type { Metadata } from "next";
import { requireRole } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminTabs from "@/app/admin/AdminTabs";
import AuditLogRow, { type AuditLogEntry } from "@/app/admin/AuditLogRow";
import styles from "../../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Activity · CHS CHAOS Admin" };

export default async function ActivityPage() {
  const me = await requireRole(["admin"]);
  const admin = createAdminClient();

  let entries: AuditLogEntry[] = [];
  if (admin) {
    const { data } = await admin
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    entries = (data as AuditLogEntry[] | null) ?? [];
  }

  return (
    <>
      <h1 className={styles.h1}>Dashboard</h1>
      <AdminTabs active="activity" role={me.role} />

      {!admin && (
        <div className={styles.error}>
          Not connected to Supabase. Set <code>NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          and <code>SUPABASE_SERVICE_ROLE_KEY</code> in the environment.
        </div>
      )}

      <section className={styles.card} style={{ maxWidth: 820 }}>
        <h2 className={styles.h2}>Recent activity</h2>
        <p className={styles.muted} style={{ marginBottom: 14 }}>
          The last {entries.length} changes made anywhere in the admin, most recent first.
        </p>
        {entries.length === 0 ? (
          <p className={styles.muted}>No activity logged yet.</p>
        ) : (
          <ul className={styles.showList}>
            {entries.map((e) => (
              <AuditLogRow key={e.id} entry={e} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
