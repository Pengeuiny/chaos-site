"use client";

import { useState } from "react";
import styles from "./admin.module.css";

/**
 * Shared date/label input for a single showtime, used by both the "add
 * event" form and each event's inline edit form. Mirrors ShowDatesField's
 * TBD-toggle pattern: real date & time required unless the admin explicitly
 * marks it not yet planned, in which case the label becomes the primary
 * (required) text shown verbatim.
 */
export default function EventDateField({
  defaultLocalInput,
  defaultStartsTbd,
  defaultLabel,
}: {
  defaultLocalInput?: string;
  defaultStartsTbd?: boolean;
  defaultLabel?: string | null;
}) {
  const [tbd, setTbd] = useState(defaultStartsTbd ?? false);
  return (
    <div className={styles.label}>
      Date &amp; time
      <label className={styles.check} style={{ fontWeight: 400, marginTop: 2 }}>
        <input
          type="checkbox"
          checked={tbd}
          onChange={(e) => setTbd(e.target.checked)}
        />{" "}
        Date not yet planned
      </label>
      <input type="hidden" name="starts_tbd" value={tbd ? "on" : ""} />

      {tbd ? (
        <input
          className={styles.input}
          name="label"
          placeholder="Coming Soon"
          defaultValue={defaultLabel ?? ""}
          required
        />
      ) : (
        <div className={styles.row2}>
          <label className={styles.label}>
            Date &amp; time * <span className={styles.hint}>(Eastern)</span>
            <input
              className={styles.input}
              type="datetime-local"
              name="starts_at"
              defaultValue={defaultLocalInput ?? ""}
              required={!tbd}
            />
          </label>
          <label className={styles.label}>
            Label
            <input
              className={styles.input}
              name="label"
              placeholder="Opening Night"
              defaultValue={defaultLabel ?? ""}
            />
          </label>
        </div>
      )}

      <p className={styles.hint} style={{ marginTop: 6 }}>
        {tbd ? (
          <>Shown exactly as you type it (e.g. &ldquo;Coming Soon&rdquo;, &ldquo;Date TBA&rdquo;) until you add a real date &amp; time.</>
        ) : (
          <>Shown as an exact date &amp; time on the show page and calendar (e.g. &ldquo;Fri, Apr 17 · 7:00 PM&rdquo;) — the optional label appears alongside it (e.g. &ldquo;Opening Night&rdquo;).</>
        )}
      </p>
    </div>
  );
}
