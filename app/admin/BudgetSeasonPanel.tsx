"use client";

import { useState } from "react";
import {
  createSeason,
  updateSeason,
  setActiveSeason,
  deleteSeason,
  approveSeason,
  rollbackSeason,
} from "./budget-actions";
import type { BudgetSeason } from "@/lib/types";
import styles from "./admin.module.css";

const ALLOCATION_LABELS = {
  equal: "Equal split across shows",
  percent_of_direct: "Percent of each show's direct cost (recommended)",
  participants: "By participant/head count",
} as const;

/** Once a season is approved, every edit gets an extra "are you sure" —
 * guards against an accidental change to the numbers being tracked toward. */
function confirmIfApproved(e: React.FormEvent<HTMLFormElement>, isApproved: boolean, what: string) {
  if (isApproved && !window.confirm(`This season's budget is approved — ${what} will be permanently logged. Are you sure?`)) {
    e.preventDefault();
  }
}

function SeasonRow({ season, canEdit }: { season: BudgetSeason; canEdit: boolean }) {
  const isApproved = season.status === "approved";
  return (
    <li className={styles.eventItem}>
      <span>
        <strong>{season.name}</strong>
        {season.is_active && <span className={styles.badge} style={{ marginLeft: 8 }}>Active</span>}
        <span
          className={styles.badge}
          style={{ marginLeft: 8, background: isApproved ? undefined : "rgba(156,143,126,.25)" }}
        >
          {isApproved ? "Approved" : "Draft"}
        </span>
        {season.start_date && season.end_date ? ` — ${season.start_date} to ${season.end_date}` : ""}
      </span>
      {canEdit && (
        <div className={styles.rowActions}>
          {!season.is_active && (
            <form action={setActiveSeason}>
              <input type="hidden" name="id" value={season.id} />
              <button className={styles.editLink} type="submit">Make active</button>
            </form>
          )}
          <form
            action={deleteSeason}
            onSubmit={(e) => confirmIfApproved(e, isApproved, "deleting this season")}
          >
            <input type="hidden" name="id" value={season.id} />
            <button className={styles.delSmall} type="submit">✕</button>
          </form>
        </div>
      )}
    </li>
  );
}

export default function BudgetSeasonPanel({
  seasons,
  activeSeason,
  canEdit,
}: {
  seasons: BudgetSeason[];
  activeSeason: BudgetSeason | null;
  canEdit: boolean;
}) {
  const [addingSeason, setAddingSeason] = useState(false);

  return (
    <div>
      {seasons.length > 0 && (
        <ul className={styles.eventList} style={{ borderTop: "none", paddingTop: 0, marginBottom: 16 }}>
          {seasons.map((s) => (
            <SeasonRow key={s.id} season={s} canEdit={canEdit} />
          ))}
        </ul>
      )}

      {canEdit &&
        (addingSeason ? (
          <form action={createSeason} className={styles.form} style={{ gap: 8, marginBottom: 20 }}>
            <div className={styles.row2}>
              <label className={styles.label}>
                Season name
                <input className={styles.input} name="name" placeholder="e.g. 2027-28" required />
              </label>
              <div className={styles.row2}>
                <label className={styles.label}>
                  Start
                  <input className={styles.input} type="date" name="start_date" />
                </label>
                <label className={styles.label}>
                  End
                  <input className={styles.input} type="date" name="end_date" />
                </label>
              </div>
            </div>
            <div className={styles.rowActions}>
              <button className={styles.btn} style={{ margin: 0 }} type="submit">Create season</button>
              <button type="button" className={styles.editLink} onClick={() => setAddingSeason(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <button type="button" className={styles.editLink} onClick={() => setAddingSeason(true)} style={{ marginBottom: 20 }}>
            + New season
          </button>
        ))}

      {activeSeason && canEdit && (
        <>
          <div className={styles.rowActions} style={{ marginBottom: 14, justifyContent: "space-between" }}>
            <h3 className={styles.h2} style={{ fontSize: 16, margin: 0 }}>Settings for {activeSeason.name}</h3>
            {activeSeason.status === "approved" ? (
              <form
                action={rollbackSeason}
                onSubmit={(e) => {
                  if (
                    !window.confirm(
                      "Roll this season back to draft? Edits will no longer require a confirmation prompt, and this will be logged.",
                    )
                  ) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="id" value={activeSeason.id} />
                <button className={styles.editLink} type="submit">Roll back to draft</button>
              </form>
            ) : (
              <form
                action={approveSeason}
                onSubmit={(e) => {
                  if (
                    !window.confirm(
                      "Approve this season's budget? This locks it in as the target being tracked toward — further edits will require confirmation, and this will be logged.",
                    )
                  ) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="id" value={activeSeason.id} />
                <button className={styles.btn} style={{ margin: 0 }} type="submit">Approve budget</button>
              </form>
            )}
          </div>
          {activeSeason.status === "approved" && (
            <p className={styles.muted} style={{ marginTop: -8, marginBottom: 12 }}>
              Approved{activeSeason.approved_by ? ` by ${activeSeason.approved_by}` : ""}
              {activeSeason.approved_at ? ` on ${activeSeason.approved_at.slice(0, 10)}` : ""}. Further
              changes will ask for confirmation.
            </p>
          )}
          <form
            action={updateSeason}
            className={styles.form}
            style={{ gap: 10 }}
            onSubmit={(e) => confirmIfApproved(e, activeSeason.status === "approved", "saving these settings")}
          >
            <input type="hidden" name="id" value={activeSeason.id} />
            <input type="hidden" name="name" value={activeSeason.name} />
            <input type="hidden" name="start_date" value={activeSeason.start_date ?? ""} />
            <input type="hidden" name="end_date" value={activeSeason.end_date ?? ""} />
            <label className={styles.label}>
              Overhead allocation method
              <select className={styles.input} name="overhead_allocation_method" defaultValue={activeSeason.overhead_allocation_method}>
                {Object.entries(ALLOCATION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <div className={styles.row2}>
              <label className={styles.label} style={{ justifyContent: "flex-end" }}>
                Default contingency %
                <div className={styles.hint}>10-15 recommended</div>
                <input className={styles.input} type="number" step="0.5" name="contingency_default_percent" defaultValue={activeSeason.contingency_default_percent} />
              </label>
              <label className={styles.label} style={{ justifyContent: "flex-end" }}>
                Dual-signature threshold ($)
                <input className={styles.input} type="number" step="1" name="dual_signature_threshold" defaultValue={activeSeason.dual_signature_threshold} />
              </label>
            </div>
            <div className={styles.row2}>
              <label className={styles.label} style={{ justifyContent: "flex-end" }}>
                Reserve target (months)
                <input className={styles.input} type="number" step="0.5" name="reserve_target_months" defaultValue={activeSeason.reserve_target_months} />
              </label>
              <label className={styles.label} style={{ justifyContent: "flex-end" }}>
                Current reserve balance ($)
                <div className={styles.hint}>entered manually</div>
                <input className={styles.input} type="number" step="0.01" name="current_reserve_balance" defaultValue={activeSeason.current_reserve_balance ?? ""} />
              </label>
            </div>
            <button className={styles.btn} type="submit">Save settings</button>
          </form>
        </>
      )}
    </div>
  );
}
