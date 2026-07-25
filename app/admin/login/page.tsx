import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin, hasAnyAdminAccount } from "@/lib/admin-auth";
import { login } from "@/app/admin/actions";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin Login · CHS CHAOS" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  if (await getCurrentAdmin()) redirect("/admin");
  const { error, ok } = await searchParams;
  const noAccountsYet = !(await hasAnyAdminAccount());

  return (
    <div className={styles.root}>
      <div className={styles.loginWrap}>
        <form action={login} className={styles.card}>
          <h1 className={styles.loginTitle}>CHS CHAOS Admin</h1>
          <p className={styles.muted}>Sign in with your admin email and password.</p>

          {ok === "setup" && (
            <p className={styles.ok}>Account created — sign in below.</p>
          )}
          {error === "1" && (
            <p className={styles.error}>Incorrect email or password. Try again.</p>
          )}

          <label className={styles.label}>
            Email
            <input
              className={styles.input}
              type="email"
              name="email"
              autoComplete="email"
              autoFocus
              required
            />
          </label>
          <label className={styles.label}>
            Password
            <input
              className={styles.input}
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>

          <button className={styles.btn} type="submit">
            Sign in
          </button>

          {noAccountsYet && (
            <p className={styles.muted}>
              No admin accounts exist yet —{" "}
              <Link className={styles.topLink} href="/admin/setup">
                set up the first one
              </Link>
              .
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
