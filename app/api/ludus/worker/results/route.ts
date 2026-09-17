import { workerGate, touchWorker } from "../_auth";
import { SCREENSHOT_BUCKET } from "@/lib/ludus";

export const dynamic = "force-dynamic";

type Body = {
  job_id?: string;
  status?: "done" | "failed";
  result?: unknown;
  error?: string;
  steps?: { label: string; png_base64?: string }[];
};

/**
 * POST /api/ludus/worker/results — outcome of one job run. Screenshots come
 * inline as base64 PNGs (one per step) and are stored in the public
 * ludus-screenshots bucket under jobs/<job_id>/.
 */
export async function POST(request: Request) {
  const gate = workerGate(request);
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  let body: Body;
  try { body = await request.json(); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }
  if (!body.job_id || (body.status !== "done" && body.status !== "failed")) {
    return Response.json({ error: "job_id and status (done|failed) required" }, { status: 400 });
  }
  const { data: job } = await admin.from("ludus_jobs").select("id, attempts").eq("id", body.job_id).maybeSingle();
  if (!job) return Response.json({ error: "job not found" }, { status: 404 });

  let stored = 0;
  const steps = (body.steps ?? []).slice(0, 60);
  for (const [i, s] of steps.entries()) {
    let path: string | null = null;
    if (s.png_base64) {
      const safe = String(s.label || "step").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "step";
      path = `jobs/${job.id}/${String(i + 1).padStart(2, "0")}-${safe}.png`;
      const bytes = Buffer.from(s.png_base64, "base64");
      const { error } = await admin.storage.from(SCREENSHOT_BUCKET).upload(path, bytes, { contentType: "image/png", upsert: true });
      if (error) { console.error("screenshot upload failed:", error.message); path = null; } else stored++;
    }
    await admin.from("ludus_job_steps").insert({ job_id: job.id, step_no: i + 1, label: String(s.label || `Step ${i + 1}`).slice(0, 200), screenshot_path: path });
  }

  const now = new Date().toISOString();
  const { error } = await admin.from("ludus_jobs").update({
    status: body.status,
    result: body.status === "done" && body.result && typeof body.result === "object" ? body.result : null,
    error: body.status === "failed" ? String(body.error || "Unknown error").slice(0, 4000) : null,
    attempts: (job.attempts ?? 0) + 1,
    finished_at: now,
    updated_at: now,
  }).eq("id", job.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await touchWorker(admin);
  return Response.json({ ok: true, screenshots: stored });
}
