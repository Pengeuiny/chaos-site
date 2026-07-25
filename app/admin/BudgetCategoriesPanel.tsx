"use client";

import { useState } from "react";
import { createCategory, renameCategory, deleteCategory } from "./budget-actions";
import type { BudgetCategory } from "@/lib/types";
import styles from "./admin.module.css";

function CategoryRow({ category, canEdit }: { category: BudgetCategory; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);

  if (editing && canEdit) {
    return (
      <li className={styles.eventItem} style={{ display: "block" }}>
        <form action={renameCategory} className={styles.form} style={{ gap: 8, flexDirection: "row", alignItems: "center" }}>
          <input type="hidden" name="id" value={category.id} />
          <input className={styles.input} name="name" defaultValue={category.name} required style={{ flex: 1 }} />
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
      <span>{category.name}</span>
      {canEdit && (
        <div className={styles.rowActions}>
          <button type="button" className={styles.editLink} onClick={() => setEditing(true)}>Edit</button>
          <form action={deleteCategory}>
            <input type="hidden" name="id" value={category.id} />
            <button className={styles.delSmall} type="submit">✕</button>
          </form>
        </div>
      )}
    </li>
  );
}

export default function BudgetCategoriesPanel({
  categories,
  canEdit,
}: {
  categories: BudgetCategory[];
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <p className={styles.muted} style={{ marginTop: -6, marginBottom: 12 }}>
        Shared across every show and season — typing a new category on a line item form also adds
        it here automatically.
      </p>
      {categories.length === 0 ? (
        <p className={styles.muted}>No categories yet — one will be added the first time you save a line item.</p>
      ) : (
        <ul className={styles.eventList} style={{ borderTop: "none", paddingTop: 0, marginBottom: canEdit ? 16 : 0 }}>
          {categories.map((c) => (
            <CategoryRow key={c.id} category={c} canEdit={canEdit} />
          ))}
        </ul>
      )}

      {canEdit &&
        (adding ? (
          <form action={createCategory} className={styles.form} style={{ gap: 8, flexDirection: "row", alignItems: "center" }}>
            <input className={styles.input} name="name" placeholder="e.g. Royalties" required style={{ flex: 1 }} />
            <div className={styles.rowActions}>
              <button className={styles.btn} style={{ margin: 0 }} type="submit">Add</button>
              <button type="button" className={styles.editLink} onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <button type="button" className={styles.editLink} onClick={() => setAdding(true)}>
            + New category
          </button>
        ))}
    </div>
  );
}
