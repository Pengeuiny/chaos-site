"use client";

import { useState } from "react";
import {
  addLineItem,
  updateLineItem,
  deleteLineItem,
  addExpense,
  updateExpense,
  deleteExpense,
} from "./budget-actions";
import { fmtMoney, contingencyCheck } from "@/lib/budget";
import type { BudgetExpense, BudgetLineItem, BudgetLineItemScope } from "@/lib/types";
import styles from "./admin.module.css";

type LineItemWithExpenses = BudgetLineItem & { budget_expenses: BudgetExpense[] };

function expenseTotals(expenses: BudgetExpense[]) {
  let committed = 0;
  let paid = 0;
  for (const e of expenses) {
    if (e.status === "paid") paid += e.amount;
    else committed += e.amount;
  }
  return { committed, paid, total: committed + paid };
}

function ExpenseRow({
  expense,
  scope,
  productionId,
  dualSignatureThreshold,
}: {
  expense: BudgetExpense;
  scope: BudgetLineItemScope;
  productionId: string | null;
  dualSignatureThreshold: number;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className={styles.eventItem} style={{ display: "block" }}>
        <form action={updateExpense} className={styles.form} style={{ gap: 8 }}>
          <input type="hidden" name="id" value={expense.id} />
          <input type="hidden" name="scope" value={scope} />
          {productionId && <input type="hidden" name="production_id" value={productionId} />}
          <div className={styles.row2}>
            <label className={styles.label}>
              Amount
              <input className={styles.input} type="number" step="0.01" name="amount" defaultValue={expense.amount} required />
            </label>
            <label className={styles.label}>
              Status
              <select className={styles.input} name="status" defaultValue={expense.status}>
                <option value="committed">Committed</option>
                <option value="paid">Paid</option>
              </select>
            </label>
          </div>
          <div className={styles.row2}>
            <label className={styles.label}>
              Vendor
              <input className={styles.input} name="vendor" defaultValue={expense.vendor ?? ""} />
            </label>
            <label className={styles.label}>
              Date
              <input className={styles.input} type="date" name="expense_date" defaultValue={expense.expense_date} />
            </label>
          </div>
          <label className={styles.label}>
            Description
            <input className={styles.input} name="description" defaultValue={expense.description ?? ""} />
          </label>
          <label className={styles.label}>
            Approved by
            <input className={styles.input} name="approved_by" defaultValue={expense.approved_by ?? ""} />
          </label>
          <div className={styles.rowActions}>
            <button className={styles.btn} style={{ margin: 0 }} type="submit">Save</button>
            <button type="button" className={styles.editLink} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={styles.eventItem}>
      <span>
        {expense.status === "paid" ? "Paid" : "Committed"} — {fmtMoney(expense.amount)}
        {expense.amount >= dualSignatureThreshold && (
          <span title={`At/above the ${fmtMoney(dualSignatureThreshold)} dual-signature threshold`}> ⚠</span>
        )}
        {expense.vendor ? ` — ${expense.vendor}` : ""}
        {expense.description ? ` (${expense.description})` : ""}
      </span>
      <div className={styles.rowActions}>
        <button type="button" className={styles.editLink} onClick={() => setEditing(true)}>Edit</button>
        <form action={deleteExpense}>
          <input type="hidden" name="id" value={expense.id} />
          <input type="hidden" name="scope" value={scope} />
          {productionId && <input type="hidden" name="production_id" value={productionId} />}
          <button className={styles.delSmall} type="submit">✕</button>
        </form>
      </div>
    </li>
  );
}

function ExpenseList({
  lineItem,
  scope,
  productionId,
  dualSignatureThreshold,
}: {
  lineItem: LineItemWithExpenses;
  scope: BudgetLineItemScope;
  productionId: string | null;
  dualSignatureThreshold: number;
}) {
  const [adding, setAdding] = useState(false);
  const { committed, paid } = expenseTotals(lineItem.budget_expenses);
  const remaining = lineItem.budgeted_amount - committed - paid;

  return (
    <div style={{ marginLeft: 14, marginTop: 6 }}>
      <p className={styles.muted} style={{ margin: "0 0 4px" }}>
        Committed {fmtMoney(committed)} · Paid {fmtMoney(paid)} · Remaining {fmtMoney(remaining)}
      </p>
      {lineItem.budget_expenses.length > 0 && (
        <ul className={styles.eventList}>
          {lineItem.budget_expenses.map((e) => (
            <ExpenseRow
              key={e.id}
              expense={e}
              scope={scope}
              productionId={productionId}
              dualSignatureThreshold={dualSignatureThreshold}
            />
          ))}
        </ul>
      )}
      {adding ? (
        <form action={addExpense} className={styles.form} style={{ gap: 8, marginTop: 8 }}>
          <input type="hidden" name="line_item_id" value={lineItem.id} />
          <input type="hidden" name="scope" value={scope} />
          {productionId && <input type="hidden" name="production_id" value={productionId} />}
          <div className={styles.row2}>
            <label className={styles.label}>
              Amount
              <input className={styles.input} type="number" step="0.01" name="amount" required />
            </label>
            <label className={styles.label}>
              Status
              <select className={styles.input} name="status" defaultValue="committed">
                <option value="committed">Committed</option>
                <option value="paid">Paid</option>
              </select>
            </label>
          </div>
          <div className={styles.row2}>
            <label className={styles.label}>
              Vendor <span className={styles.hint}>(optional)</span>
              <input className={styles.input} name="vendor" />
            </label>
            <label className={styles.label}>
              Date
              <input className={styles.input} type="date" name="expense_date" />
            </label>
          </div>
          <label className={styles.label}>
            Description <span className={styles.hint}>(optional)</span>
            <input className={styles.input} name="description" />
          </label>
          <label className={styles.label}>
            Approved by <span className={styles.hint}>(optional — {fmtMoney(dualSignatureThreshold)}+ should have a second sign-off)</span>
            <input className={styles.input} name="approved_by" />
          </label>
          <div className={styles.rowActions}>
            <button className={styles.btn} style={{ margin: 0 }} type="submit">Log expense</button>
            <button type="button" className={styles.editLink} onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" className={styles.editLink} onClick={() => setAdding(true)} style={{ marginTop: 4 }}>
          + Log expense
        </button>
      )}
    </div>
  );
}

function LineItemRow({
  item,
  scope,
  productionId,
  dualSignatureThreshold,
}: {
  item: LineItemWithExpenses;
  scope: BudgetLineItemScope;
  productionId: string | null;
  dualSignatureThreshold: number;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className={styles.showItem}>
        <form action={updateLineItem} className={styles.form} style={{ gap: 8 }}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="scope" value={scope} />
          {productionId && <input type="hidden" name="production_id" value={productionId} />}
          <div className={styles.row2}>
            <label className={styles.label}>
              Category
              <input className={styles.input} name="category" defaultValue={item.category} required />
            </label>
            <label className={styles.label}>
              Budgeted amount
              <input className={styles.input} type="number" step="0.01" name="budgeted_amount" defaultValue={item.budgeted_amount} required />
            </label>
          </div>
          <label className={styles.label}>
            Description <span className={styles.hint}>(optional — leave notes for next year)</span>
            <input className={styles.input} name="description" defaultValue={item.description ?? ""} />
          </label>
          <label className={styles.check}>
            <input type="checkbox" name="is_contingency" defaultChecked={item.is_contingency} />{" "}
            This is the contingency line
          </label>
          <input type="hidden" name="sort_order" value={item.sort_order} />
          <div className={styles.rowActions}>
            <button className={styles.btn} style={{ margin: 0 }} type="submit">Save</button>
            <button type="button" className={styles.editLink} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={styles.showItem}>
      <div className={styles.showHead}>
        <div>
          <strong>{item.category}</strong>{" "}
          {item.is_contingency && <span className={styles.badge}>Contingency</span>}
          {item.description && (
            <div className={styles.muted} style={{ marginTop: 2 }}>{item.description}</div>
          )}
        </div>
        <div className={styles.rowActions}>
          <span style={{ fontWeight: 700 }}>{fmtMoney(item.budgeted_amount)}</span>
          <button type="button" className={styles.editLink} onClick={() => setEditing(true)}>Edit</button>
          <form action={deleteLineItem}>
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="scope" value={scope} />
            {productionId && <input type="hidden" name="production_id" value={productionId} />}
            <button className={styles.delSmall} type="submit">✕</button>
          </form>
        </div>
      </div>
      <ExpenseList
        lineItem={item}
        scope={scope}
        productionId={productionId}
        dualSignatureThreshold={dualSignatureThreshold}
      />
    </li>
  );
}

export default function BudgetLineItemsSection({
  lineItems,
  seasonId,
  scope,
  productionId,
  dualSignatureThreshold,
  contingencyDefaultPercent,
}: {
  lineItems: LineItemWithExpenses[];
  seasonId: string;
  scope: BudgetLineItemScope;
  productionId?: string | null;
  dualSignatureThreshold: number;
  contingencyDefaultPercent: number;
}) {
  const [adding, setAdding] = useState(false);
  const pid = productionId ?? null;

  const budgetedTotal = lineItems.reduce((s, l) => s + l.budgeted_amount, 0);
  const allExpenses = lineItems.flatMap((l) => l.budget_expenses);
  const { committed, paid } = expenseTotals(allExpenses);
  const contingency = contingencyCheck(lineItems);

  return (
    <div>
      <p style={{ margin: "0 0 12px" }}>
        Budgeted <strong>{fmtMoney(budgetedTotal)}</strong> · Committed {fmtMoney(committed)} · Paid {fmtMoney(paid)} · Remaining{" "}
        {fmtMoney(budgetedTotal - committed - paid)}
      </p>
      {scope === "show" && contingency.percentOfOtherLines !== null && (
        <p className={contingency.withinRecommendedRange ? styles.muted : styles.error} style={contingency.withinRecommendedRange ? {} : { padding: 8 }}>
          Contingency is {contingency.percentOfOtherLines.toFixed(1)}% of the rest of the show&rsquo;s budget
          {contingency.withinRecommendedRange
            ? " (within the recommended 10-15% range)."
            : ` — recommended range is 10-15% (default: ${contingencyDefaultPercent}%).`}
        </p>
      )}

      {lineItems.length === 0 ? (
        <p className={styles.muted}>No line items yet.</p>
      ) : (
        <ul className={styles.showList}>
          {lineItems.map((item) => (
            <LineItemRow
              key={item.id}
              item={item}
              scope={scope}
              productionId={pid}
              dualSignatureThreshold={dualSignatureThreshold}
            />
          ))}
        </ul>
      )}

      {adding ? (
        <form action={addLineItem} className={styles.form} style={{ gap: 8, marginTop: 16 }}>
          <input type="hidden" name="season_id" value={seasonId} />
          <input type="hidden" name="scope" value={scope} />
          {pid && <input type="hidden" name="production_id" value={pid} />}
          <input type="hidden" name="sort_order" value={lineItems.length} />
          <div className={styles.row2}>
            <label className={styles.label}>
              Category
              <input className={styles.input} name="category" placeholder="e.g. Royalties, Set, Costumes" required />
            </label>
            <label className={styles.label}>
              Budgeted amount
              <input className={styles.input} type="number" step="0.01" name="budgeted_amount" required />
            </label>
          </div>
          <label className={styles.label}>
            Description <span className={styles.hint}>(optional)</span>
            <input className={styles.input} name="description" />
          </label>
          <label className={styles.check}>
            <input type="checkbox" name="is_contingency" /> This is the contingency line
          </label>
          <div className={styles.rowActions}>
            <button className={styles.btn} style={{ margin: 0 }} type="submit">Add line item</button>
            <button type="button" className={styles.editLink} onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" className={styles.btn} onClick={() => setAdding(true)}>
          + Add line item
        </button>
      )}
    </div>
  );
}
