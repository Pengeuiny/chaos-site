import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAuthed, adminConfigured } from "@/lib/admin-auth";
import { login } from "@/app/admin/actions";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin Login · CHS CHAOS" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAuthed()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <div className={styles.root}>
      <div className={styles.loginWrap}>
        <form action={login} className={styles.card}>
          <h1 className={styles.loginTitle}>CHS CHAOS Admin</h1>
          <p className={styles.muted}>Enter the admin password to continue.</p>

          {error === "1" && (
            <p className={styles.error}>Incorrect password. Try again.</p>
          )}
          {error === "config" && (
            <p className={styles.error}>
              Admin isn&rsquo;t configured. Set <code>ADMIN_PASSWORD</code> in
              the environment.
            </p>
          )}

          <label className={styles.label}>
            Password
            <input
              className={styles.input}
              type="password"
              name="password"
              autoComplete="current-password"
              autoFocus
              required
            />
          </label>

          <button className={styles.btn} type="submit">
            Sign in
          </button>
          {!adminConfigured() && (
            <p className={styles.muted}>
              Note: no <code>ADMIN_PASSWORD</code> is set yet.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
