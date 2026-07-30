"use client";

import { useState } from "react";
import { updateEvent, deleteEvent } from "./actions";
import { fmtDay, fmtTime } from "@/lib/format";
import EventDateField from "./EventDateField";
import styles from "./admin.module.css";

type EventRow = {
  id: string;
  starts_at: string | null;
  starts_tbd: boolean;
  label: string | null;
  ticket_url: string | null;
  is_performance: boolean;
  sort_order: number;
};

/** One showtime row in the admin dashboard: view mode, or an inline edit form. */
export default function EventListItem({
  event,
  localInput,
  canEdit,
}: {
  event: EventRow;
  localInput: string;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing && canEdit) {
    return (
      <li className={styles.eventItem} style={{ display: "block" }}>
        <form action={updateEvent} className={styles.form} style={{ gap: 10 }}>
          <input type="hidden" name="id" value={event.id} />
          <EventDateField
            defaultLocalInput={localInput}
            defaultStartsTbd={event.starts_tbd}
            defaultLabel={event.label}
          />
          <label className={styles.label}>
            Ticket URL
            <input
              className={styles.input}
              name="ticket_url"
              placeholder="https://…"
              defaultValue={event.ticket_url ?? ""}
            />
          </label>
          <label className={styles.check}>
            <input type="checkbox" name="is_performance" defaultChecked={event.is_performance} />{" "}
            Public performance
            <span className={styles.hint}>
              {" "}(uncheck for auditions/callbacks/tech week/informational meetings)
            </span>
          </label>
          <label className={styles.label}>
            Sort order
            <input
              className={styles.input}
              type="number"
              name="sort_order"
              defaultValue={event.sort_order}
            />
          </label>
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
      <span>
        {event.starts_tbd || !event.starts_at ? (
          event.label || "Date TBA"
        ) : (
          <>
            {fmtDay(event.starts_at)} · {fmtTime(event.starts_at)}
            {event.label ? ` — ${event.label}` : ""}
          </>
        )}
        {!event.is_performance && (
          <span className={styles.hint} style={{ marginLeft: 6 }}>
            (prep date)
          </span>
        )}
        {event.ticket_url && (
          <a
            href={event.ticket_url}
            target="_blank"
            rel="noopener"
            title="Ticket link"
            style={{ marginLeft: 8 }}
          >
            🎟
          </a>
        )}
      </span>
      {canEdit && (
        <div className={styles.rowActions}>
          <button
            type="button"
            className={styles.editLink}
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
          <form action={deleteEvent}>
            <input type="hidden" name="id" value={event.id} />
            <button className={styles.delSmall} type="submit">
              ✕
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
