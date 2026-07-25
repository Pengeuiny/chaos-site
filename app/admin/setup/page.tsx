import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasAnyAdminAccount, setupKeyConfigured } from "@/lib/admin-auth";
import { createFirstAdmin } from "@/app/admin/setup-actions";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin Setup · CHS CHAOS" };

const ERR: Record<string, string> = {
  config: "ADMIN_PASSWORD isn't set in the environment — set it before running setup.",
  key: "Incorrect setup key.",
  name: "A name is required.",
  email: "A valid email is required.",
  password: "Password must be at least 8 characters.",
  nodb: "Supabase service-role key isn't configured (SUPABASE_SERVICE_ROLE_KEY).",
  create: "Could not create the account. Check the server logs.",
};

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // This route is a one-time bootstrap — the instant any admin account
  // exists, it's permanently inert.
  if (await hasAnyAdminAccount()) redirect("/admin/login");
  const { error } = await searchParams;

  return (
    <div className={styles.root}>
      <div className={styles.loginWrap}>
        <form action={createFirstAdmin} className={styles.card}>
          <h1 className={styles.loginTitle}>Set Up the First Admin Account</h1>
          <p className={styles.muted}>
            This one-time page creates the first real admin account. It only
            works while no admin accounts exist yet, and requires the
            server&rsquo;s <code>ADMIN_PASSWORD</code> as a setup key.
          </p>

          {error && <p className={styles.error}>{ERR[error] ?? "Something went wrong."}</p>}
          {!setupKeyConfigured() && (
            <p className={styles.error}>
              Note: no <code>ADMIN_PASSWORD</code> is set yet — setup won&rsquo;t work
              until it is.
            </p>
          )}

          <label className={styles.label}>
            <span>Setup key <span className={styles.hint}>(the server&rsquo;s ADMIN_PASSWORD)</span></span>
            <input className={styles.input} type="password" name="setup_key" required />
          </label>
          <label className={styles.label}>
            Your name
            <input className={styles.input} name="name" required />
          </label>
          <label className={styles.label}>
            Email
            <input className={styles.input} type="email" name="email" required />
          </label>
          <label className={styles.label}>
            <span>Choose a password <span className={styles.hint}>(at least 8 characters)</span></span>
            <input className={styles.input} type="password" name="password" minLength={8} required />
          </label>

          <button className={styles.btn} type="submit">
            Create admin account
          </button>
        </form>
      </div>
    </div>
  );
}
