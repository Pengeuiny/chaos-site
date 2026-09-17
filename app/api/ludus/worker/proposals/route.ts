import { workerGate, touchWorker } from "../_auth";

export const dynamic = "force-dynamic";

const KINDS = new Set(["collection", "event", "skip"]);

/**
 * POST /api/ludus/worker/proposals — the interpreter's answer for one row:
 * { row_id, jobs: [{ kind, spec, notes, confidence }] , error? }.
 * Creates `proposed` jobs for the admin to review; an empty list becomes one
 * `skip` proposal so the row still shows up with the interpreter's reasoning.
 */
export async function POST(request: Request) {
  const gate = workerGate(request);
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  let body: { row_id?: string; jobs?: { kind: string; spec?: unknown; notes?: string; confidence?: number }[]; error?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }
  if (!body.row_id) return Response.json({ error: "row_id required" }, { status: 400 });

  const { data: row } = await admin.from("ludus_rows").select("id, status").eq("id", body.row_id).maybeSingle();
  if (!row) return Response.json({ error: "row not found" }, { status: 404 });

  if (body.error) {
    await admin.from("ludus_rows").update({ status: "error", error: String(body.error).slice(0, 2000) }).eq("id", row.id);
    await touchWorker(admin);
    return Response.json({ ok: true, status: "error" });
  }

  const jobs = (body.jobs ?? []).filter((j) => KINDS.has(j.kind));
  const inserts = (jobs.length ? jobs : [{ kind: "skip", notes: "Interpreter proposed nothing for this row." }]).map((j) => ({
    row_id: row.id,
    kind: j.kind,
    spec: j.spec && typeof j.spec === "object" ? j.spec : {},
    notes: j.notes ? String(j.notes).slice(0, 4000) : null,
    confidence: typeof j.confidence === "number" ? Math.max(0, Math.min(1, j.confidence)) : null,
    status: "proposed",
  }));
  const { error } = await admin.from("ludus_jobs").insert(inserts);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await admin.from("ludus_rows").update({ status: "proposed", error: null }).eq("id", row.id);
  await touchWorker(admin);
  return Response.json({ ok: true, created: inserts.length });
}
