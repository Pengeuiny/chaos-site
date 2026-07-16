import AdminTabs from "@/app/admin/AdminTabs";
import styles from "../admin.module.css";

// Shown instantly on navigation while the target tab's page (and its data
// fetch) is still resolving, instead of the browser sitting on the previous
// page with no feedback. Doesn't reduce the underlying query time, but the
// tab bar and a skeleton appear immediately so a click always feels
// responsive even when the page behind it takes a moment.
export default function AdminLoading() {
  return (
    <>
      <h1 className={styles.h1}>Dashboard</h1>
      <AdminTabs />
      <div className={styles.card} style={{ maxWidth: 640 }}>
        <p className={styles.muted}>Loading…</p>
      </div>
    </>
  );
}
