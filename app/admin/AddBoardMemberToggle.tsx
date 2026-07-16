"use client";

import { useState } from "react";
import { addBoardMember } from "./people-actions";
import PersonPhotoField from "./PersonPhotoField";
import styles from "./admin.module.css";

export default function AddBoardMemberToggle() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={styles.showHead} style={{ marginBottom: open ? 16 : 0 }}>
        <h2 className={styles.h2} style={{ margin: 0 }}>
          Board Members
        </h2>
        <button
          type="button"
          className={styles.editLink}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Cancel" : "+ Add Board Member"}
        </button>
      </div>

      {open && (
        <form action={addBoardMember} className={styles.form} style={{ marginBottom: 24 }}>
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
            Contact email
            <input
              className={styles.input}
              type="email"
              name="email"
              placeholder="name@chschaos.org"
            />
          </label>
          <PersonPhotoField />
          <button className={styles.btn} type="submit">
            Add board member
          </button>
        </form>
      )}
    </>
  );
}
