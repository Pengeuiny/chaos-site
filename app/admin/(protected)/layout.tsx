import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { logout } from "@/app/admin/actions";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // eslint-disable-next-line react-hooks/purity -- temporary perf diagnostic
  const t0 = Date.now();
  await requireAdmin();
  // eslint-disable-next-line react-hooks/purity -- temporary perf diagnostic
  console.log(`[perf] requireAdmin(): ${Date.now() - t0}ms`);
  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          CHS CHAOS <span>Admin</span>
        </div>
        <div className={styles.topActions}>
          <Link className={styles.topLink} href="/" target="_blank">
            View site ↗
          </Link>
          <form action={logout}>
            <button className={styles.linkBtn} type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
