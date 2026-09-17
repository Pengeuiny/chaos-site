import { workerGate, touchWorker } from "../_auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/ludus/worker/tasks — the worker's poll. Hands back (and claims)
 * new sheet rows to interpret and approved jobs to run. Claiming flips rows
 * to `interpreting` and jobs to `running` so a second poll never repeats work;
 * anything claimed but never reported back is released after an hour.
 */
export async function GET(request: Request) {
  const gate = workerGate(request);
  if ("error" in gate) return gate.error;
  const { admin } = gate;
  const now = new Date().toISOString();
  const staleClaim = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Release abandoned claims.
  await admin.from("ludus_rows").update({ status: "new" }).eq("status", "interpreting").lt("last_seen_at", staleClaim);
  await admin.from("ludus_jobs").update({ status: "approved", claimed_at: null }).eq("status", "running").lt("claimed_at", staleClaim);

  const { data: rows } = await admin.from("ludus_rows").select("id, row_number, raw").eq("status", "new").order("row_number").limit(20);
  const rowIds = (rows ?? []).map((r) => r.id);
  if (rowIds.length) await admin.from("ludus_rows").update({ status: "interpreting" }).in("id", rowIds);

  const { data: jobs } = await admin.from("ludus_jobs").select("id, kind, spec, row_id").eq("status", "approved").order("approved_at").limit(5);
  const jobIds = (jobs ?? []).map((j) => j.id);
  if (jobIds.length) await admin.from("ludus_jobs").update({ status: "running", claimed_at: now, started_at: now, updated_at: now }).in("id", jobIds);

  await touchWorker(admin);
  return Response.json({ rows: rows ?? [], jobs: jobs ?? [], served_at: now });
}
