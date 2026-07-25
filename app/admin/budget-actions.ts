"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

const BUDGET_ROLES = ["admin", "treasurer"] as const;

function str(v: FormDataEntryValue | null) {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

function num(v: FormDataEntryValue | null) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(v: FormDataEntryValue | null) {
  const s = (v ?? "").toString().trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Where a line-item/expense/revenue form should land back on after saving. */
function pathForScope(scope: string, production_id: string | null) {
  if (scope === "show" && production_id) return `/admin/budget/shows/${production_id}`;
  if (scope === "overhead") return "/admin/budget/overhead";
  if (scope === "trip") return "/admin/budget/trip";
  return "/admin/budget";
}

// ---------------------------------------------------------------------------
// Seasons
// ---------------------------------------------------------------------------

export async function createSeason(formData: FormData) {
  const actor = await requireRole([...BUDGET_ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin/budget?error=nodb");

  const name = str(formData.get("name"));
  if (!name) redirect("/admin/budget?error=name");

  const { count } = await admin
    .from("budget_seasons")
    .select("id", { count: "exact", head: true });
  const isFirstSeason = (count ?? 0) === 0;

  const { data, error } = await admin
    .from("budget_seasons")
    .insert({
      name,
      start_date: str(formData.get("start_date")),
      end_date: str(formData.get("end_date")),
      is_active: isFirstSeason,
      overhead_allocation_method: str(formData.get("overhead_allocation_method")) || "percent_of_direct",
      contingency_default_percent: num(formData.get("contingency_default_percent")) || 12.5,
      dual_signature_threshold: num(formData.get("dual_signature_threshold")) || 250,
      reserve_target_months: num(formData.get("reserve_target_months")) || 3,
      current_reserve_balance: numOrNull(formData.get("current_reserve_balance")),
    })
    .select()
    .single();

  if (error) redirect("/admin/budget?error=save");
  await logAudit(admin, actor, { table: "budget_seasons", rowId: data.id, action: "insert", after: data });
  revalidatePath("/admin/budget");
  redirect("/admin/budget?ok=season_added");
}

export async function updateSeason(formData: FormData) {
  const actor = await requireRole([...BUDGET_ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin/budget?error=nodb");

  const id = str(formData.get("id"));
  const name = str(formData.get("name"));
  if (!id) redirect("/admin/budget?error=save");
  if (!name) redirect("/admin/budget?error=name");

  const { data: before } = await admin.from("budget_seasons").select("*").eq("id", id).single();
  const { data: after, error } = await admin
    .from("budget_seasons")
    .update({
      name,
      start_date: str(formData.get("start_date")),
      end_date: str(formData.get("end_date")),
      overhead_allocation_method: str(formData.get("overhead_allocation_method")) || "percent_of_direct",
      contingency_default_percent: num(formData.get("contingency_default_percent")) || 12.5,
      dual_signature_threshold: num(formData.get("dual_signature_threshold")) || 250,
      reserve_target_months: num(formData.get("reserve_target_months")) || 3,
      current_reserve_balance: numOrNull(formData.get("current_reserve_balance")),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) redirect("/admin/budget?error=save");
  await logAudit(admin, actor, { table: "budget_seasons", rowId: id, action: "update", before, after });
  revalidatePath("/admin/budget");
  redirect("/admin/budget?ok=season_updated");
}

export async function setActiveSeason(formData: FormData) {
  const actor = await requireRole([...BUDGET_ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin/budget?error=nodb");
  const id = str(formData.get("id"));
  if (!id) redirect("/admin/budget?error=save");

  await admin.from("budget_seasons").update({ is_active: false }).neq("id", id);
  const { data: after, error } = await admin
    .from("budget_seasons")
    .update({ is_active: true })
    .eq("id", id)
    .select()
    .single();

  if (error) redirect("/admin/budget?error=save");
  await logAudit(admin, actor, {
    table: "budget_seasons",
    rowId: id,
    action: "update",
    before: { is_active: false },
    after,
  });
  revalidatePath("/admin/budget");
  redirect("/admin/budget?ok=season_activated");
}

export async function deleteSeason(formData: FormData) {
  const actor = await requireRole([...BUDGET_ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin/budget?error=nodb");
  const id = str(formData.get("id"));
  if (id) {
    const { data: before } = await admin.from("budget_seasons").select("*").eq("id", id).single();
    await admin.from("budget_seasons").delete().eq("id", id); // cascades
    await logAudit(admin, actor, { table: "budget_seasons", rowId: id, action: "delete", before });
  }
  revalidatePath("/admin/budget");
  redirect("/admin/budget?ok=season_deleted");
}

// ---------------------------------------------------------------------------
// Line items (show / overhead / trip)
// ---------------------------------------------------------------------------

export async function addLineItem(formData: FormData) {
  const actor = await requireRole([...BUDGET_ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin/budget?error=nodb");

  const season_id = str(formData.get("season_id"));
  const scope = str(formData.get("scope")) || "show";
  const production_id = str(formData.get("production_id"));
  const category = str(formData.get("category"));
  const path = pathForScope(scope, production_id);

  if (!season_id) redirect(`${path}?error=season`);
  if (!category) redirect(`${path}?error=category`);
  if (scope === "show" && !production_id) redirect(`${path}?error=show`);

  const { data, error } = await admin
    .from("budget_line_items")
    .insert({
      season_id,
      production_id: scope === "show" ? production_id : null,
      scope,
      category,
      description: str(formData.get("description")),
      budgeted_amount: num(formData.get("budgeted_amount")),
      is_contingency: formData.get("is_contingency") === "on",
      sort_order: num(formData.get("sort_order")),
    })
    .select()
    .single();

  if (error) redirect(`${path}?error=save`);
  await logAudit(admin, actor, { table: "budget_line_items", rowId: data.id, action: "insert", after: data });
  revalidatePath(path);
  revalidatePath("/admin/budget");
  redirect(`${path}?ok=line_added`);
}

export async function updateLineItem(formData: FormData) {
  const actor = await requireRole([...BUDGET_ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin/budget?error=nodb");

  const id = str(formData.get("id"));
  const scope = str(formData.get("scope")) || "show";
  const production_id = str(formData.get("production_id"));
  const category = str(formData.get("category"));
  const path = pathForScope(scope, production_id);

  if (!id) redirect(`${path}?error=save`);
  if (!category) redirect(`${path}?error=category`);

  const { data: before } = await admin.from("budget_line_items").select("*").eq("id", id).single();
  const { data: after, error } = await admin
    .from("budget_line_items")
    .update({
      category,
      description: str(formData.get("description")),
      budgeted_amount: num(formData.get("budgeted_amount")),
      is_contingency: formData.get("is_contingency") === "on",
      sort_order: num(formData.get("sort_order")),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) redirect(`${path}?error=save`);
  await logAudit(admin, actor, { table: "budget_line_items", rowId: id, action: "update", before, after });
  revalidatePath(path);
  revalidatePath("/admin/budget");
  redirect(`${path}?ok=line_updated`);
}

export async function deleteLineItem(formData: FormData) {
  const actor = await requireRole([...BUDGET_ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin/budget?error=nodb");

  const id = str(formData.get("id"));
  const scope = str(formData.get("scope")) || "show";
  const production_id = str(formData.get("production_id"));
  const path = pathForScope(scope, production_id);

  if (id) {
    const { data: before } = await admin.from("budget_line_items").select("*").eq("id", id).single();
    await admin.from("budget_line_items").delete().eq("id", id); // cascades expenses
    await logAudit(admin, actor, { table: "budget_line_items", rowId: id, action: "delete", before });
  }
  revalidatePath(path);
  revalidatePath("/admin/budget");
  redirect(`${path}?ok=line_deleted`);
}

// ---------------------------------------------------------------------------
// Expenses (the actuals ledger against a line item)
// ---------------------------------------------------------------------------

export async function addExpense(formData: FormData) {
  const actor = await requireRole([...BUDGET_ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin/budget?error=nodb");

  const line_item_id = str(formData.get("line_item_id"));
  const scope = str(formData.get("scope")) || "show";
  const production_id = str(formData.get("production_id"));
  const path = pathForScope(scope, production_id);

  if (!line_item_id) redirect(`${path}?error=save`);

  const { data, error } = await admin
    .from("budget_expenses")
    .insert({
      line_item_id,
      amount: num(formData.get("amount")),
      status: str(formData.get("status")) || "committed",
      vendor: str(formData.get("vendor")),
      description: str(formData.get("description")),
      expense_date: str(formData.get("expense_date")) || new Date().toISOString().slice(0, 10),
      approved_by: str(formData.get("approved_by")),
    })
    .select()
    .single();

  if (error) redirect(`${path}?error=save`);
  await logAudit(admin, actor, { table: "budget_expenses", rowId: data.id, action: "insert", after: data });
  revalidatePath(path);
  revalidatePath("/admin/budget");
  redirect(`${path}?ok=expense_added`);
}

export async function updateExpense(formData: FormData) {
  const actor = await requireRole([...BUDGET_ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin/budget?error=nodb");

  const id = str(formData.get("id"));
  const scope = str(formData.get("scope")) || "show";
  const production_id = str(formData.get("production_id"));
  const path = pathForScope(scope, production_id);

  if (!id) redirect(`${path}?error=save`);

  const { data: before } = await admin.from("budget_expenses").select("*").eq("id", id).single();
  const { data: after, error } = await admin
    .from("budget_expenses")
    .update({
      amount: num(formData.get("amount")),
      status: str(formData.get("status")) || "committed",
      vendor: str(formData.get("vendor")),
      description: str(formData.get("description")),
      expense_date: str(formData.get("expense_date")) || new Date().toISOString().slice(0, 10),
      approved_by: str(formData.get("approved_by")),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) redirect(`${path}?error=save`);
  await logAudit(admin, actor, { table: "budget_expenses", rowId: id, action: "update", before, after });
  revalidatePath(path);
  revalidatePath("/admin/budget");
  redirect(`${path}?ok=expense_updated`);
}

export async function deleteExpense(formData: FormData) {
  const actor = await requireRole([...BUDGET_ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin/budget?error=nodb");

  const id = str(formData.get("id"));
  const scope = str(formData.get("scope")) || "show";
  const production_id = str(formData.get("production_id"));
  const path = pathForScope(scope, production_id);

  if (id) {
    const { data: before } = await admin.from("budget_expenses").select("*").eq("id", id).single();
    await admin.from("budget_expenses").delete().eq("id", id);
    await logAudit(admin, actor, { table: "budget_expenses", rowId: id, action: "delete", before });
  }
  revalidatePath(path);
  revalidatePath("/admin/budget");
  redirect(`${path}?ok=expense_deleted`);
}

// ---------------------------------------------------------------------------
// Revenue lines
// ---------------------------------------------------------------------------

export async function addRevenueLine(formData: FormData) {
  const actor = await requireRole([...BUDGET_ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin/budget/revenue?error=nodb");

  const season_id = str(formData.get("season_id"));
  const source_type = str(formData.get("source_type"));
  if (!season_id) redirect("/admin/budget/revenue?error=season");
  if (!source_type) redirect("/admin/budget/revenue?error=source");

  const { data, error } = await admin
    .from("budget_revenue_lines")
    .insert({
      season_id,
      production_id: str(formData.get("production_id")),
      source_type,
      projected_amount: num(formData.get("projected_amount")),
      actual_amount: numOrNull(formData.get("actual_amount")),
      notes: str(formData.get("notes")),
      sort_order: num(formData.get("sort_order")),
    })
    .select()
    .single();

  if (error) redirect("/admin/budget/revenue?error=save");
  await logAudit(admin, actor, { table: "budget_revenue_lines", rowId: data.id, action: "insert", after: data });
  revalidatePath("/admin/budget/revenue");
  revalidatePath("/admin/budget");
  redirect("/admin/budget/revenue?ok=revenue_added");
}

export async function updateRevenueLine(formData: FormData) {
  const actor = await requireRole([...BUDGET_ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin/budget/revenue?error=nodb");

  const id = str(formData.get("id"));
  const source_type = str(formData.get("source_type"));
  if (!id) redirect("/admin/budget/revenue?error=save");
  if (!source_type) redirect("/admin/budget/revenue?error=source");

  const { data: before } = await admin.from("budget_revenue_lines").select("*").eq("id", id).single();
  const { data: after, error } = await admin
    .from("budget_revenue_lines")
    .update({
      production_id: str(formData.get("production_id")),
      source_type,
      projected_amount: num(formData.get("projected_amount")),
      actual_amount: numOrNull(formData.get("actual_amount")),
      notes: str(formData.get("notes")),
      sort_order: num(formData.get("sort_order")),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) redirect("/admin/budget/revenue?error=save");
  await logAudit(admin, actor, { table: "budget_revenue_lines", rowId: id, action: "update", before, after });
  revalidatePath("/admin/budget/revenue");
  revalidatePath("/admin/budget");
  redirect("/admin/budget/revenue?ok=revenue_updated");
}

export async function deleteRevenueLine(formData: FormData) {
  const actor = await requireRole([...BUDGET_ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin/budget/revenue?error=nodb");
  const id = str(formData.get("id"));
  if (id) {
    const { data: before } = await admin.from("budget_revenue_lines").select("*").eq("id", id).single();
    await admin.from("budget_revenue_lines").delete().eq("id", id);
    await logAudit(admin, actor, { table: "budget_revenue_lines", rowId: id, action: "delete", before });
  }
  revalidatePath("/admin/budget/revenue");
  revalidatePath("/admin/budget");
  redirect("/admin/budget/revenue?ok=revenue_deleted");
}
