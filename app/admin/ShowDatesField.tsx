"use client";

import { useState } from "react";
import styles from "./admin.module.css";

export default function ShowDatesField({
  defaultStartsOn,
  defaultEndsOn,
  defaultDatesTbd,
  defaultDateRange,
}: {
  defaultStartsOn?: string | null;
  defaultEndsOn?: string | null;
  defaultDatesTbd?: boolean;
  defaultDateRange?: string | null;
}) {
  const [tbd, setTbd] = useState(defaultDatesTbd ?? false);

  return (
    <div className={styles.label}>
      Dates
      <label className={styles.check} style={{ fontWeight: 400, marginTop: 2 }}>
        <input
          type="checkbox"
          checked={tbd}
          onChange={(e) => setTbd(e.target.checked)}
        />{" "}
        Dates not yet planned
      </label>
      <input type="hidden" name="dates_tbd" value={tbd ? "on" : ""} />

      {tbd ? (
        <input
          className={styles.input}
          name="date_range"
          placeholder="Coming Soon"
          defaultValue={defaultDateRange ?? ""}
        />
      ) : (
        <div className={styles.row2}>
          <label className={styles.label}>
            Start date *
            <input
              className={styles.input}
              type="date"
              name="starts_on"
              defaultValue={defaultStartsOn ?? ""}
              required={!tbd}
            />
          </label>
          <label className={styles.label}>
            End date *
            <input
              className={styles.input}
              type="date"
              name="ends_on"
              defaultValue={defaultEndsOn ?? ""}
              required={!tbd}
            />
          </label>
        </div>
      )}

      <p className={styles.hint} style={{ marginTop: 6 }}>
        {tbd ? (
          <>
            Shown exactly as you type it (e.g. &ldquo;Coming Soon&rdquo;,
            &ldquo;Auditions announced soon&rdquo;) until you add a real date
            range.
          </>
        ) : (
          <>
            If this show already has performances entered in the Events tab,
            its actual dates are used automatically instead of this range.
            Otherwise: within ~2 months this shows as-is with an &ldquo;On
            Sale&rdquo; badge (e.g. &ldquo;Apr 16–18, 2026&rdquo;) — further
            out it&rsquo;s shown by season instead (e.g. &ldquo;Fall
            2026&rdquo;). Once the end date passes, it&rsquo;s automatically
            marked &ldquo;Past&rdquo;.
          </>
        )}
      </p>
    </div>
  );
}
