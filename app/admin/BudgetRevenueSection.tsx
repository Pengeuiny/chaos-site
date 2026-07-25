"use client";

import { useState } from "react";
import { addRevenueLine, updateRevenueLine, deleteRevenueLine } from "./budget-actions";
import { fmtMoney, revenueDiversification } from "@/lib/budget";
import type { BudgetRevenueLine, BudgetRevenueSourceType } from "@/lib/types";
import styles from "./admin.module.css";

const SOURCE_LABELS: Record<BudgetRevenueSourceType, string> = {
  tickets: "Tickets",
  concessions: "Concessions",
  program_ads: "Program ads",
  merch: "Merchandise",
  donations: "Donations",
  sponsorships: "Sponsorships",
  grants: "Grants",
  fundraisers: "Fundraisers",
  other: "Other",
};
const SOURCE_TYPES = Object.keys(SOURCE_LABELS) as BudgetRevenueSourceType[];

function RevenueRow({
  line,
  productions,
  percentOfTotal,
  overConcentrated,
  canEdit,
}: {
  line: BudgetRevenueLine;
  productions: { id: string; title: string }[];
  percentOfTotal: number;
  overConcentrated: boolean;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing && canEdit) {
    return (
      <li className={styles.eventItem} style={{ display: "block" }}>
        <form action={updateRevenueLine} className={styles.form} style={{ gap: 8 }}>
          <input type="hidden" name="id" value={line.id} />
          <div className={styles.row2}>
            <label className={styles.label}>
              Source
              <select className={styles.input} name="source_type" defaultValue={line.source_type}>
                {SOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>{SOURCE_LABELS[t]}</option>
                ))}
              </select>
            </label>
            <label className={styles.label}>
              Show <span className={styles.hint}>(optional — leave blank if season-wide)</span>
              <select className={styles.input} name="production_id" defaultValue={line.production_id ?? ""}>
                <option value="">— Season-wide —</option>
                {productions.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.row2}>
            <label className={styles.label}>
              Projected
              <input className={styles.input} type="number" step="0.01" name="projected_amount" defaultValue={line.projected_amount} required />
            </label>
            <label className={styles.label}>
              Actual <span className={styles.hint}>(optional — fill in as it comes in)</span>
              <input className={styles.input} type="number" step="0.01" name="actual_amount" defaultValue={line.actual_amount ?? ""} />
            </label>
          </div>
          <label className={styles.label}>
            Notes <span className={styles.hint}>(optional)</span>
            <input className={styles.input} name="notes" defaultValue={line.notes ?? ""} />
          </label>
          <input type="hidden" name="sort_order" value={line.sort_order} />
          <div className={styles.rowActions}>
            <button className={styles.btn} style={{ margin: 0 }} type="submit">Save</button>
            <button type="button" className={styles.editLink} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      </li>
    );
  }

  const show = productions.find((p) => p.id === line.production_id);

  return (
    <li className={styles.eventItem}>
      <span>
        <strong>{SOURCE_LABELS[line.source_type]}</strong>
        {show ? ` — ${show.title}` : ""} — projected {fmtMoney(line.projected_amount)}
        {line.actual_amount != null ? `, actual ${fmtMoney(line.actual_amount)}` : ""} ({percentOfTotal.toFixed(0)}% of total)
        {overConcentrated && (
          <span className={styles.badge} style={{ marginLeft: 6 }}>Over ~30%</span>
        )}
        {line.notes ? ` — ${line.notes}` : ""}
      </span>
      {canEdit && (
        <div className={styles.rowActions}>
          <button type="button" className={styles.editLink} onClick={() => setEditing(true)}>Edit</button>
          <form action={deleteRevenueLine}>
            <input type="hidden" name="id" value={line.id} />
            <button className={styles.delSmall} type="submit">✕</button>
          </form>
        </div>
      )}
    </li>
  );
}

export default function BudgetRevenueSection({
  revenueLines,
  seasonId,
  productions,
  canEdit,
}: {
  revenueLines: BudgetRevenueLine[];
  seasonId: string;
  productions: { id: string; title: string }[];
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const { streams, total } = revenueDiversification(revenueLines);
  const percentByStream = new Map(streams.map((s) => [s.source_type, s]));

  return (
    <div>
      <p style={{ margin: "0 0 12px" }}>
        Total projected/actual revenue: <strong>{fmtMoney(total)}</strong>
      </p>
      {streams.filter((s) => s.overConcentrated).map((s) => (
        <p key={s.source_type} className={styles.error}>
          {SOURCE_LABELS[s.source_type]} is {s.percentOfTotal.toFixed(0)}% of total revenue — no stream should be much above ~30%.
        </p>
      ))}

      {revenueLines.length === 0 ? (
        <p className={styles.muted}>No revenue lines yet.</p>
      ) : (
        <ul className={styles.eventList} style={{ borderTop: "none", paddingTop: 0 }}>
          {revenueLines.map((line) => {
            const share = percentByStream.get(line.source_type);
            return (
              <RevenueRow
                key={line.id}
                line={line}
                productions={productions}
                percentOfTotal={share?.percentOfTotal ?? 0}
                overConcentrated={share?.overConcentrated ?? false}
                canEdit={canEdit}
              />
            );
          })}
        </ul>
      )}

      {canEdit && (adding ? (
        <form action={addRevenueLine} className={styles.form} style={{ gap: 8, marginTop: 16 }}>
          <input type="hidden" name="season_id" value={seasonId} />
          <input type="hidden" name="sort_order" value={revenueLines.length} />
          <div className={styles.row2}>
            <label className={styles.label}>
              Source
              <select className={styles.input} name="source_type" defaultValue="tickets">
                {SOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>{SOURCE_LABELS[t]}</option>
                ))}
              </select>
            </label>
            <label className={styles.label}>
              Show <span className={styles.hint}>(optional)</span>
              <select className={styles.input} name="production_id" defaultValue="">
                <option value="">— Season-wide —</option>
                {productions.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.row2}>
            <label className={styles.label}>
              Projected
              <input className={styles.input} type="number" step="0.01" name="projected_amount" required />
            </label>
            <label className={styles.label}>
              Actual <span className={styles.hint}>(optional)</span>
              <input className={styles.input} type="number" step="0.01" name="actual_amount" />
            </label>
          </div>
          <label className={styles.label}>
            Notes <span className={styles.hint}>(optional)</span>
            <input className={styles.input} name="notes" />
          </label>
          <div className={styles.rowActions}>
            <button className={styles.btn} style={{ margin: 0 }} type="submit">Add revenue line</button>
            <button type="button" className={styles.editLink} onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" className={styles.btn} onClick={() => setAdding(true)}>
          + Add revenue line
        </button>
      ))}
    </div>
  );
}
