// The CHAOS Ludus worker. Runs on a home machine, polls the site, interprets
// new sheet rows with a local Ollama model, and creates approved jobs in the
// Ludus admin with Playwright. Nothing here decides anything on its own: rows
// only become jobs after a board member approves them on /admin/ludus.
//
//   node worker.mjs          # poll forever (POLL_MINUTES apart)
//   node worker.mjs --once   # one poll, then exit (handy for testing)

import { interpretRow } from "./interpret.mjs";
import { openBrowser, runCollectionJob, NeedsAttention } from "./ludus.mjs";

const VERSION = "0.1.0";
const SITE = (process.env.SITE_URL || "").replace(/\/$/, "");
const TOKEN = process.env.LUDUS_WORKER_TOKEN || "";
const POLL_MS = Math.max(1, Number(process.env.POLL_MINUTES || 10)) * 60 * 1000;
const once = process.argv.includes("--once");

if (!SITE || !TOKEN) { console.error("SITE_URL and LUDUS_WORKER_TOKEN are required (see .env.example)"); process.exit(1); }

const log = (...a) => console.log(new Date().toISOString(), ...a);

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${SITE}/api/ludus/worker/${path}`, {
    method,
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(120000),
  });
  if (res.status === 401) throw new Error("Site rejected the worker token (401) — LUDUS_WORKER_TOKEN mismatch");
  if (!res.ok) throw new Error(`${method} ${path}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function heartbeat(status, message) {
  await api("heartbeat", { method: "POST", body: { status, message, version: VERSION } }).catch((e) => log("heartbeat failed:", e.message));
}

async function interpret(rows) {
  for (const row of rows) {
    log(`interpreting row ${row.row_number}`);
    try {
      const { jobs } = await interpretRow(row.raw);
      await api("proposals", { method: "POST", body: { row_id: row.id, jobs } });
      log(`  proposed ${jobs.length} job(s): ${jobs.map((j) => `${j.kind}${j.spec?.name ? ` "${j.spec.name}"` : ""}`).join("; ")}`);
    } catch (e) {
      log(`  interpreter error: ${e.message}`);
      await api("proposals", { method: "POST", body: { row_id: row.id, error: e.message } }).catch(() => {});
    }
  }
}

async function run(jobs) {
  if (!jobs.length) return;
  const ctx = await openBrowser();
  try {
    for (const job of jobs) {
      log(`running job ${job.id} (${job.kind})`);
      const steps = [];
      const page = await ctx.newPage();
      try {
        if (job.kind !== "collection") throw new Error(`Job kind "${job.kind}" is not implemented in this worker yet`);
        const result = await runCollectionJob(page, job.spec, steps);
        await api("results", { method: "POST", body: { job_id: job.id, status: "done", result, steps } });
        log(`  done: ${Object.values(result.links)[0]}`);
      } catch (e) {
        const png = await page.screenshot({ fullPage: false }).catch(() => null);
        steps.push({ label: `Error: ${e.message.slice(0, 120)}`, png_base64: png ? png.toString("base64") : undefined });
        await api("results", { method: "POST", body: { job_id: job.id, status: "failed", error: e.message, steps } }).catch((e2) => log("  could not report failure:", e2.message));
        log(`  failed: ${e.message}`);
        if (e instanceof NeedsAttention) throw e;
      } finally {
        await page.close().catch(() => {});
      }
    }
  } finally {
    await ctx.close().catch(() => {});
  }
}

async function poll() {
  const { rows, jobs } = await api("tasks");
  log(`poll: ${rows.length} row(s) to interpret, ${jobs.length} job(s) to run`);
  await interpret(rows);
  await run(jobs);
}

let attention = null;
for (;;) {
  try {
    await poll();
    attention = null;
    await heartbeat("ok");
  } catch (e) {
    if (e instanceof NeedsAttention) {
      attention = e.message;
      log("NEEDS ATTENTION:", e.message);
      await heartbeat("needs_attention", e.message);
    } else {
      log("poll error:", e.message);
      await heartbeat(attention ? "needs_attention" : "ok", attention ?? `Last poll error: ${e.message}`);
    }
  }
  if (once) break;
  await new Promise((r) => setTimeout(r, POLL_MS));
}
