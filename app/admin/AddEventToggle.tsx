"use client";

import { useState } from "react";
import { addEvent } from "./actions";
import EventDateField from "./EventDateField";
import styles from "./admin.module.css";

export default function AddEventToggle({
  shows,
}: {
  shows: { id: string; title: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={styles.showHead} style={{ marginBottom: open ? 16 : 0 }}>
        <h2 className={styles.h2} style={{ margin: 0 }}>
          All Events
        </h2>
        {shows.length > 0 && (
          <button
            type="button"
            className={styles.editLink}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Cancel" : "+ Add Event"}
          </button>
        )}
      </div>

      {shows.length === 0 && (
        <p className={styles.muted}>
          Create a show first — events attach to a show.
        </p>
      )}

      {open && (
        <form action={addEvent} className={styles.form} style={{ marginBottom: 24 }}>
          <label className={styles.label}>
            Show *
            <select className={styles.input} name="production_id" required defaultValue="">
              <option value="" disabled>
                Select a show…
              </option>
              {shows.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          <EventDateField />
          <label className={styles.label}>
            Ticket URL <span className={styles.hint}>(optional)</span>
            <input className={styles.input} name="ticket_url" placeholder="https://…" />
          </label>
          <label className={styles.label}>
            Sort order
            <input className={styles.input} type="number" name="sort_order" defaultValue={0} />
          </label>
          <button className={styles.btn} type="submit">
            Add event
          </button>
        </form>
      )}
    </>
  );
}
