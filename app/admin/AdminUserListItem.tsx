"use client";

import { useState } from "react";
import { updateAdminUser, resetAdminUserPassword } from "./user-actions";
import type { AdminUserRow } from "./(protected)/users/page";
import styles from "./admin.module.css";

export default function AdminUserListItem({ user }: { user: AdminUserRow }) {
  const [editing, setEditing] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (editing) {
    return (
      <li className={styles.eventItem} style={{ display: "block" }}>
        <form action={updateAdminUser} className={styles.form} style={{ gap: 10 }}>
          <input type="hidden" name="id" value={user.id} />
          <div className={styles.row2}>
            <label className={styles.label}>
              Name
              <input className={styles.input} name="name" defaultValue={user.name} required />
            </label>
            <label className={styles.label}>
              Role
              <select className={styles.input} name="role" defaultValue={user.role}>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="treasurer">Treasurer</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>
          </div>
          <label className={styles.check}>
            <input type="checkbox" name="is_active" defaultChecked={user.is_active} /> Active
          </label>
          <div className={styles.rowActions}>
            <button className={styles.btn} style={{ margin: 0 }} type="submit">Save</button>
            <button type="button" className={styles.editLink} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      </li>
    );
  }

  if (resetting) {
    return (
      <li className={styles.eventItem} style={{ display: "block" }}>
        <form action={resetAdminUserPassword} className={styles.form} style={{ gap: 10 }}>
          <input type="hidden" name="id" value={user.id} />
          <label className={styles.label}>
            <span>New password for {user.name} <span className={styles.hint}>(at least 8 characters)</span></span>
            <input className={styles.input} type="password" name="password" minLength={8} required />
          </label>
          <div className={styles.rowActions}>
            <button className={styles.btn} style={{ margin: 0 }} type="submit">Reset password</button>
            <button type="button" className={styles.editLink} onClick={() => setResetting(false)}>Cancel</button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={styles.eventItem}>
      <span>
        <strong>{user.name}</strong> — {user.email}
        <span className={styles.badge} style={{ marginLeft: 8, textTransform: "capitalize" }}>
          {user.role}
        </span>
        {!user.is_active && (
          <span className={styles.badge} style={{ marginLeft: 6 }}>Inactive</span>
        )}
      </span>
      <div className={styles.rowActions}>
        <button type="button" className={styles.editLink} onClick={() => setResetting(true)}>
          Reset password
        </button>
        <button type="button" className={styles.editLink} onClick={() => setEditing(true)}>
          Edit
        </button>
      </div>
    </li>
  );
}
