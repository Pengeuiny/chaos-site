import type { SupabaseClient } from "@supabase/supabase-js";
import type { CurrentAdmin } from "@/lib/admin-auth";

export type AuditAction = "insert" | "update" | "delete";

/**
 * Records one mutation to audit_log: who did it, which table/row, and the
 * before/after snapshot. Best-effort — a logging failure shouldn't block the
 * actual mutation, which has already succeeded by the time this is called.
 */
export async function logAudit(
  admin: SupabaseClient,
  actor: CurrentAdmin,
  params: {
    table: string;
    rowId: string | null;
    action: AuditAction;
    before?: unknown;
    after?: unknown;
  },
) {
  const { error } = await admin.from("audit_log").insert({
    admin_user_id: actor.id,
    admin_user_name: actor.name,
    table_name: params.table,
    row_id: params.rowId,
    action: params.action,
    before: params.before ?? null,
    after: params.after ?? null,
  });
  if (error) console.error("logAudit failed:", error);
}
