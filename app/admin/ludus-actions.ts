"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { syncSheet, type CollectionSpec } from "@/lib/ludus";

const ROLES = ["admin", "editor"] as const;
const PAGE = "/admin/ludus";

function str(v: FormDataEntryValue | null) {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

export async function saveSheetUrl(formData: FormData) {
  const actor = await requireRole([...ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect(`${PAGE}?error=nodb`);
  const sheet_url = str(formData.get("sheet_url"));
  if (sheet_url && !/^https?:\/\//i.test(sheet_url)) redirect(`${PAGE}?error=url`);

  const { data: before } = await admin.from("ludus_settings").select("*").eq("id", 1).single();
  const { data: after, error } = await admin
    .from("ludus_settings")
    .update({ sheet_url, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select()
    .single();
  if (error) redirect(`${PAGE}?error=save`);
  await logAudit(admin, actor, { table: "ludus_settings", rowId: null, action: "update", before, after });
  redirect(`${PAGE}?ok=saved`);
}

export async function syncSheetNow() {
  await requireRole([...ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect(`${PAGE}?error=nodb`);
  const { data: settings } = await admin.from("ludus_settings").select("sheet_url").eq("id", 1).single();
  if (!settings?.sheet_url) redirect(`${PAGE}?error=nourl`);

  try {
    const r = await syncSheet(admin, settings.sheet_url);
    redirect(`${PAGE}?ok=synced&n=${r.inserted}&seen=${r.seen}&stale=${r.stale}`);
  } catch (e) {
    // redirect() throws internally; let that through.
    if (e && typeof e === "object" && "digest" in e) throw e;
    const message = e instanceof Error ? e.message : String(e);
    await admin.from("ludus_settings").update({ last_sync_error: message.slice(0, 1000) }).eq("id", 1);
    redirect(`${PAGE}?error=sync`);
  }
}

/** Light validation so an obviously broken spec never reaches the worker. */
function validateSpec(kind: string, spec: unknown): string | null {
  if (kind === "skip") return null;
  if (!spec || typeof spec !== "object") return "Spec must be a JSON object.";
  if (kind === "collection") {
    const s = spec as Partial<CollectionSpec>;
    if (!s.name) return "Collection needs a name.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.deadline_date ?? "")) return "deadline_date must be YYYY-MM-DD.";
    if (!/^\d{2}:\d{2}$/.test(s.deadline_time ?? "")) return "deadline_time must be HH:MM (24-hour).";
    if (!Array.isArray(s.fees) || s.fees.length === 0) return "At least one fee is required.";
    for (const f of s.fees) {
      if (!f?.name) return "Every fee needs a name.";
      if (typeof f.price !== "number" || !(f.price >= 0)) return `Fee "${f.name}" needs a numeric price.`;
    }
    if (s.form) {
      if (!s.form.name || !Array.isArray(s.form.fields)) return "Form needs a name and a fields list.";
      for (const fld of s.form.fields) {
        if (!fld?.label || !fld.type) return "Every form field needs a label and a type.";
        if (["dropdown", "checkboxes", "radio"].includes(fld.type) && !(fld.options?.length)) return `Field "${fld.label}" needs options.`;
      }
    }
    return null;
  }
  if (kind === "event") return "Event jobs aren't supported by the worker yet — reject this one or wait for the event recipe.";
  return "Unknown job kind.";
}

export async function approveJob(formData: FormData) {
  const actor = await requireRole([...ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect(`${PAGE}?error=nodb`);
  const id = str(formData.get("id"));
  if (!id) redirect(`${PAGE}?error=job`);

  const { data: before } = await admin.from("ludus_jobs").select("*").eq("id", id).single();
  if (!before || !["proposed", "failed", "rejected"].includes(before.status)) redirect(`${PAGE}?error=state`);

  let spec: unknown = before.spec;
  const specText = str(formData.get("spec"));
  if (specText) {
    try { spec = JSON.parse(specText); } catch { redirect(`${PAGE}?error=json`); }
  }
  const problem = validateSpec(before.kind, spec);
  if (problem) redirect(`${PAGE}?error=spec&msg=${encodeURIComponent(problem)}`);

  const now = new Date().toISOString();
  const { data: after, error } = await admin
    .from("ludus_jobs")
    .update({ spec, status: "approved", approved_by: actor.name, approved_at: now, error: null, updated_at: now })
    .eq("id", id)
    .select()
    .single();
  if (error) redirect(`${PAGE}?error=save`);
  await logAudit(admin, actor, { table: "ludus_jobs", rowId: id, action: "update", before, after });
  redirect(`${PAGE}?ok=approved`);
}

export async function rejectJob(formData: FormData) {
  const actor = await requireRole([...ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect(`${PAGE}?error=nodb`);
  const id = str(formData.get("id"));
  if (!id) redirect(`${PAGE}?error=job`);
  const { data: before } = await admin.from("ludus_jobs").select("*").eq("id", id).single();
  if (!before || !["proposed", "approved", "failed"].includes(before.status)) redirect(`${PAGE}?error=state`);
  const { data: after, error } = await admin
    .from("ludus_jobs")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) redirect(`${PAGE}?error=save`);
  await logAudit(admin, actor, { table: "ludus_jobs", rowId: id, action: "update", before, after });
  redirect(`${PAGE}?ok=rejected`);
}

/** Send a row back through the interpreter (e.g. after fixing the sheet's wording elsewhere). */
export async function reinterpretRow(formData: FormData) {
  const actor = await requireRole([...ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect(`${PAGE}?error=nodb`);
  const id = str(formData.get("id"));
  if (!id) redirect(`${PAGE}?error=job`);
  const { data: before } = await admin.from("ludus_rows").select("*").eq("id", id).single();
  if (!before) redirect(`${PAGE}?error=state`);
  await admin.from("ludus_jobs").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("row_id", id).in("status", ["proposed", "approved"]);
  const { data: after } = await admin.from("ludus_rows").update({ status: "new", error: null }).eq("id", id).select().single();
  await logAudit(admin, actor, { table: "ludus_rows", rowId: id, action: "update", before, after });
  redirect(`${PAGE}?ok=requeued`);
}
