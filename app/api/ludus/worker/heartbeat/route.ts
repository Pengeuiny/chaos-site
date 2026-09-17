import { workerGate, touchWorker } from "../_auth";

export const dynamic = "force-dynamic";

/** POST /api/ludus/worker/heartbeat — { status: "ok"|"needs_attention", message?, version? }. */
export async function POST(request: Request) {
  const gate = workerGate(request);
  if ("error" in gate) return gate.error;
  let body: { status?: string; message?: string; version?: string } = {};
  try { body = await request.json(); } catch { /* empty heartbeat is fine */ }
  await touchWorker(gate.admin, {
    worker_status: body.status === "needs_attention" ? "needs_attention" : "ok",
    worker_message: body.message ? String(body.message).slice(0, 1000) : null,
    worker_version: body.version ? String(body.version).slice(0, 50) : null,
  });
  return Response.json({ ok: true });
}
