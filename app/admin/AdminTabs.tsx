import Link from "next/link";
import styles from "./admin.module.css";

const TABS = [
  { href: "/admin", key: "shows", label: "Shows" },
  { href: "/admin/events", key: "events", label: "Events" },
  { href: "/admin/board", key: "board", label: "Board Members" },
  { href: "/admin/its", key: "its", label: "ITS Board" },
  { href: "/admin/social", key: "social", label: "Social Media" },
  { href: "/admin/about", key: "about", label: "About This Site" },
] as const;

export default function AdminTabs({
  active,
}: {
  active?: (typeof TABS)[number]["key"];
}) {
  return (
    <nav className={styles.adminTabs}>
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={t.key === active ? styles.adminTabActive : styles.adminTab}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
