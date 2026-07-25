"use client";

import { useState } from "react";
import { createSeason, updateSeason, setActiveSeason, deleteSeason } from "./budget-actions";
import type { BudgetSeason } from "@/lib/types";
import styles from "./admin.module.css";

const ALLOCATION_LABELS = {
  equal: "Equal split across shows",
  percent_of_direct: "Percent of each show's direct cost (recommended)",
  participants: "By participant/head count",
} as const;

function SeasonRow({ season }: { season: BudgetSeason }) {
  return (
    <li className={styles.eventItem}>
      <span>
        <strong>{season.name}</strong>
        {season.is_active && <span className={styles.badge} style={{ marginLeft: 8 }}>Active</span>}
        {season.start_date && season.end_date ? ` — ${season.start_date} to ${season.end_date}` : ""}
      </span>
      <div className={styles.rowActions}>
        {!season.is_active && (
          <form action={setActiveSeason}>
            <input type="hidden" name="id" value={season.id} />
            <button className={styles.editLink} type="submit">Make active</button>
          </form>
        )}
        <form action={deleteSeason}>
          <input type="hidden" name="id" value={season.id} />
          <button className={styles.delSmall} type="submit">✕</button>
        </form>
      </div>
    </li>
  );
}

export default function BudgetSeasonPanel({
  seasons,
  activeSeason,
}: {
  seasons: BudgetSeason[];
  activeSeason: BudgetSeason | null;
}) {
  const [addingSeason, setAddingSeason] = useState(false);

  return (
    <div>
      {seasons.length > 0 && (
        <ul className={styles.eventList} style={{ borderTop: "none", paddingTop: 0, marginBottom: 16 }}>
          {seasons.map((s) => (
            <SeasonRow key={s.id} season={s} />
          ))}
        </ul>
      )}

      {addingSeason ? (
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
      )}

      {activeSeason && (
        <>
          <h3 className={styles.h2} style={{ fontSize: 16 }}>Settings for {activeSeason.name}</h3>
          <form action={updateSeason} className={styles.form} style={{ gap: 10 }}>
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
              <label className={styles.label}>
                Default contingency %
                <div className={styles.hint}>10-15 recommended</div>
                <input className={styles.input} type="number" step="0.5" name="contingency_default_percent" defaultValue={activeSeason.contingency_default_percent} />
              </label>
              <label className={styles.label}>
                Dual-signature threshold ($)
                <div className={styles.hint}>&nbsp;</div>
                <input className={styles.input} type="number" step="1" name="dual_signature_threshold" defaultValue={activeSeason.dual_signature_threshold} />
              </label>
            </div>
            <div className={styles.row2}>
              <label className={styles.label}>
                Reserve target (months)
                <div className={styles.hint}>&nbsp;</div>
                <input className={styles.input} type="number" step="0.5" name="reserve_target_months" defaultValue={activeSeason.reserve_target_months} />
              </label>
              <label className={styles.label}>
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
