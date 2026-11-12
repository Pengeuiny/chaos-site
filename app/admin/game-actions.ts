"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { startRehearsal } from "@/lib/game";

const ROLES = ["admin", "editor"] as const;

export async function startRehearsalAction(formData: FormData) {
  await requireRole([...ROLES]);
  const id = String(formData.get("production_id") ?? "");
  const { error } = await startRehearsal(id);
  redirect(`/admin/game?${error ? "error=save" : "ok=started"}`);
}

/** Ends a rehearsal now and deletes it (players cascade) — rehearsal results are never kept. */
export async function endRehearsalAction(formData: FormData) {
  await requireRole([...ROLES]);
  const db = createAdminClient()!;
  await db.from("game_sessions").delete().eq("id", String(formData.get("id"))).eq("is_rehearsal", true);
  redirect("/admin/game?ok=ended");
}

export async function setHiddenAction(formData: FormData) {
  const actor = await requireRole([...ROLES]);
  const db = createAdminClient()!;
  const id = String(formData.get("id"));
  const hidden = formData.get("hidden") === "true";
  const { data } = await db.from("game_players").update({ hidden }).eq("id", id).select().single();
  await logAudit(db, actor, { table: "game_players", rowId: id, action: "update", after: data });
  redirect(`/admin/game?ok=${hidden ? "hidden" : "shown"}`);
}
