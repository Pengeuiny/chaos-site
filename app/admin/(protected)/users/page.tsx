import type { Metadata } from "next";
import { requireRole } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminTabs from "@/app/admin/AdminTabs";
import AdminUserListItem from "@/app/admin/AdminUserListItem";
import AddAdminUserToggle from "@/app/admin/AddAdminUserToggle";
import styles from "../../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Users · CHS CHAOS Admin" };

export type AdminUserRow = {
  id: string;
  name: string;
  role: "admin" | "editor" | "treasurer" | "viewer";
  is_active: boolean;
  email: string;
};

const OK: Record<string, string> = {
  added: "Account created.",
  updated: "Account updated.",
  passwordreset: "Password reset.",
};
const ERR: Record<string, string> = {
  nodb: "Supabase service-role key isn't configured (SUPABASE_SERVICE_ROLE_KEY).",
  name: "A name is required.",
  email: "A valid email is required.",
  password: "Password must be at least 8 characters.",
  role: "Pick a valid role.",
  create: "Could not create the account.",
  save: "Could not save.",
  lastadmin: "Can't remove the last active admin — promote someone else first.",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const me = await requireRole(["admin"]);
  const { ok, error } = await searchParams;
  const admin = createAdminClient();

  let users: AdminUserRow[] = [];
  if (admin) {
    const [{ data: profiles }, { data: authUsers }] = await Promise.all([
      admin.from("admin_profiles").select("*").order("created_at", { ascending: true }),
      admin.auth.admin.listUsers(),
    ]);
    const emailById = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    users = (profiles ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      is_active: p.is_active,
      email: emailById.get(p.id) ?? "",
    }));
  }

  return (
    <>
      <h1 className={styles.h1}>Dashboard</h1>
      <AdminTabs active="users" role={me.role} />

      {ok && OK[ok] && <div className={styles.ok}>{OK[ok]}</div>}
      {error && <div className={styles.error}>{ERR[error] ?? "Something went wrong."}</div>}
      {!admin && (
        <div className={styles.error}>
          Not connected to Supabase. Set <code>NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          and <code>SUPABASE_SERVICE_ROLE_KEY</code> in the environment.
        </div>
      )}

      <section className={styles.card} style={{ maxWidth: 720 }}>
        <AddAdminUserToggle />

        {users.length === 0 ? (
          <p className={styles.muted}>No admin accounts yet.</p>
        ) : (
          <ul className={styles.eventList} style={{ borderTop: "none", paddingTop: 0 }}>
            {users.map((u) => (
              <AdminUserListItem key={u.id} user={u} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
