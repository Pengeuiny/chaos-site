import Link from "next/link";
import type { AdminRole } from "@/lib/admin-auth";
import styles from "./admin.module.css";

const TABS = [
  { href: "/admin", key: "shows", label: "Shows" },
  { href: "/admin/events", key: "events", label: "Events" },
  { href: "/admin/board", key: "board", label: "Board Members" },
  { href: "/admin/its", key: "its", label: "ITS Board" },
  { href: "/admin/social", key: "social", label: "Social Media" },
  { href: "/admin/budget", key: "budget", label: "Budget" },
  { href: "/admin/about", key: "about", label: "About This Site" },
  { href: "/admin/users", key: "users", label: "Users", roles: ["admin"] },
  { href: "/admin/activity", key: "activity", label: "Activity", roles: ["admin"] },
] as const;

export default function AdminTabs({
  active,
  role,
}: {
  active?: (typeof TABS)[number]["key"];
  /** Omit only for the transient loading skeleton — every real page passes it. */
  role?: AdminRole;
}) {
  const visible = TABS.filter(
    (t) => !("roles" in t) || !role || (t.roles as readonly string[]).includes(role),
  );
  return (
    <nav className={styles.adminTabs}>
      {visible.map((t) => (
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
