"use client";

import { useState } from "react";
import { addItsMember } from "./people-actions";
import styles from "./admin.module.css";

export default function AddItsMemberToggle() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={styles.showHead} style={{ marginBottom: open ? 16 : 0 }}>
        <h2 className={styles.h2} style={{ margin: 0 }}>
          ITS Board
        </h2>
        <button
          type="button"
          className={styles.editLink}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Cancel" : "+ Add ITS Member"}
        </button>
      </div>

      {open && (
        <form action={addItsMember} className={styles.form} style={{ marginBottom: 24 }}>
          <div className={styles.row2}>
            <label className={styles.label}>
              Name *
              <input className={styles.input} name="name" required />
            </label>
            <label className={styles.label}>
              Title *
              <input className={styles.input} name="role" placeholder="President" required />
            </label>
          </div>
          <label className={styles.label}>
            Contact email <span className={styles.hint}>(optional — most student officers don&rsquo;t list one)</span>
            <input className={styles.input} type="email" name="email" />
          </label>
          <button className={styles.btn} type="submit">
            Add ITS member
          </button>
        </form>
      )}
    </>
  );
}
