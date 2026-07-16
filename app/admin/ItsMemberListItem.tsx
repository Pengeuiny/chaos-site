"use client";

import { useState } from "react";
import { updateItsMember, deleteItsMember } from "./people-actions";
import PersonPhotoField from "./PersonPhotoField";
import styles from "./admin.module.css";

type Person = {
  id: string;
  name: string;
  role: string;
  email: string | null;
  image_url: string | null;
};

/** One ITS board member row: view mode, or an inline edit form. */
export default function ItsMemberListItem({ person }: { person: Person }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className={styles.eventItem} style={{ display: "block" }}>
        <form action={updateItsMember} className={styles.form} style={{ gap: 10 }}>
          <input type="hidden" name="id" value={person.id} />
          <div className={styles.row2}>
            <label className={styles.label}>
              Name
              <input
                className={styles.input}
                name="name"
                defaultValue={person.name}
                required
              />
            </label>
            <label className={styles.label}>
              Title
              <input
                className={styles.input}
                name="role"
                defaultValue={person.role}
                required
              />
            </label>
          </div>
          <label className={styles.label}>
            Contact email <span className={styles.hint}>(optional)</span>
            <input
              className={styles.input}
              type="email"
              name="email"
              defaultValue={person.email ?? ""}
            />
          </label>
          <PersonPhotoField defaultValue={person.image_url} />
          <div className={styles.rowActions}>
            <button className={styles.btn} style={{ margin: 0 }} type="submit">
              Save
            </button>
            <button
              type="button"
              className={styles.editLink}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={styles.eventItem}>
      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {person.image_url && (
          <span className={styles.personPhotoPreview} style={{ width: 32, flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={person.image_url} alt="" />
          </span>
        )}
        <span>
          <strong>{person.name}</strong> — {person.role}
          {person.email && <> · {person.email}</>}
        </span>
      </span>
      <div className={styles.rowActions}>
        <button
          type="button"
          className={styles.editLink}
          onClick={() => setEditing(true)}
        >
          Edit
        </button>
        <form action={deleteItsMember}>
          <input type="hidden" name="id" value={person.id} />
          <button className={styles.delSmall} type="submit">
            ✕
          </button>
        </form>
      </div>
    </li>
  );
}
