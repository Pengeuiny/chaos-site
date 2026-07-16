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
  await requireAdmin();
  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          CHS CHAOS <span>Admin</span>
        </div>
        <div className={styles.topActions}>
          <Link className={styles.topLink} href="/admin/social">
            Social Media
          </Link>
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
