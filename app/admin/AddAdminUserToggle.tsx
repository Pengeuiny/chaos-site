"use client";

import { useState } from "react";
import { createAdminUser } from "./user-actions";
import styles from "./admin.module.css";

export default function AddAdminUserToggle() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={styles.showHead} style={{ marginBottom: open ? 16 : 0 }}>
        <h2 className={styles.h2} style={{ margin: 0 }}>
          Admin Accounts
        </h2>
        <button type="button" className={styles.editLink} onClick={() => setOpen((o) => !o)}>
          {open ? "Cancel" : "+ Add Account"}
        </button>
      </div>

      {open && (
        <form action={createAdminUser} className={styles.form} style={{ marginBottom: 24 }}>
          <div className={styles.row2}>
            <label className={styles.label}>
              Name
              <input className={styles.input} name="name" required />
            </label>
            <label className={styles.label}>
              Role
              <select className={styles.input} name="role" defaultValue="editor">
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="treasurer">Treasurer</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>
          </div>
          <label className={styles.label}>
            Email
            <input className={styles.input} type="email" name="email" required />
          </label>
          <label className={styles.label}>
            <span>Initial password <span className={styles.hint}>(at least 8 characters)</span></span>
            <input className={styles.input} type="password" name="password" minLength={8} required />
          </label>
          <button className={styles.btn} type="submit">
            Create account
          </button>
        </form>
      )}
    </>
  );
}
