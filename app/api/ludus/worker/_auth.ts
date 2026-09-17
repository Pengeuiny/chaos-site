import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWorkerToken } from "@/lib/ludus";

/**
 * Shared gate for the worker routes: bearer token + a service-role client.
 * Returns a Response to send back on failure, or the client on success.
 */
export function workerGate(request: Request) {
  if (!verifyWorkerToken(request)) {
    return { error: Response.json({ error: "unauthorized" }, { status: 401 }) };
  }
  const admin = createAdminClient();
  if (!admin) return { error: Response.json({ error: "database not configured" }, { status: 500 }) };
  return { admin };
}

export async function touchWorker(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  fields: { worker_status?: "ok" | "needs_attention"; worker_message?: string | null; worker_version?: string | null } = {},
) {
  await admin.from("ludus_settings").update({ worker_last_seen_at: new Date().toISOString(), ...fields }).eq("id", 1);
}
