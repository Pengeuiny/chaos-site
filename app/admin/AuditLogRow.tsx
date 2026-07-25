"use client";

import { useState } from "react";
import styles from "./admin.module.css";

export type AuditLogEntry = {
  id: string;
  admin_user_name: string | null;
  table_name: string;
  row_id: string | null;
  action: "insert" | "update" | "delete";
  before: unknown;
  after: unknown;
  created_at: string;
};

const ACTION_LABEL: Record<AuditLogEntry["action"], string> = {
  insert: "Created",
  update: "Updated",
  delete: "Deleted",
};

export default function AuditLogRow({ entry }: { entry: AuditLogEntry }) {
  const [open, setOpen] = useState(false);
  const when = new Date(entry.created_at).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <li className={styles.showItem}>
      <div className={styles.showHead}>
        <div>
          <strong>{entry.admin_user_name ?? "Unknown user"}</strong>{" "}
          <span className={styles.badge}>{ACTION_LABEL[entry.action]}</span>{" "}
          <span className={styles.muted}>{entry.table_name}</span>
          <div className={styles.muted} style={{ marginTop: 2 }}>{when}</div>
        </div>
        <button type="button" className={styles.editLink} onClick={() => setOpen((o) => !o)}>
          {open ? "Hide details" : "View details"}
        </button>
      </div>
      {open && (
        <div className={styles.row2} style={{ marginTop: 10 }}>
          <div>
            <div className={styles.muted} style={{ marginBottom: 4 }}>Before</div>
            <pre style={{ fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
              {entry.before ? JSON.stringify(entry.before, null, 2) : "—"}
            </pre>
          </div>
          <div>
            <div className={styles.muted} style={{ marginBottom: 4 }}>After</div>
            <pre style={{ fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
              {entry.after ? JSON.stringify(entry.after, null, 2) : "—"}
            </pre>
          </div>
        </div>
      )}
    </li>
  );
}
