import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDay, fmtTime } from "@/lib/format";
import { SCREENSHOT_BUCKET, type LudusJob, type LudusJobStep, type LudusRow, type LudusSettings } from "@/lib/ludus";
import AdminTabs from "@/app/admin/AdminTabs";
import { approveJob, rejectJob, reinterpretRow, saveSheetUrl, syncSheetNow } from "@/app/admin/ludus-actions";
import styles from "../../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ludus · CHS CHAOS Admin" };

const OK: Record<string, string> = {
  saved: "Sheet link saved.",
  synced: "Sheet synced.",
  approved: "Approved — the worker will pick it up on its next poll.",
  rejected: "Rejected.",
  requeued: "Row sent back to the interpreter.",
};
const ERR: Record<string, string> = {
  nodb: "Supabase service-role key isn't configured (SUPABASE_SERVICE_ROLE_KEY).",
  url: "That doesn't look like a link.",
  nourl: "Save a sheet link first.",
  sync: "Sync failed — see the error under the sheet link.",
  json: "The spec isn't valid JSON.",
  spec: "The spec is incomplete.",
  state: "That item isn't in a state where this action applies.",
  save: "Could not save.",
  job: "Missing job.",
};

type JobWithRow = LudusJob & { ludus_rows: LudusRow | null; ludus_job_steps: LudusJobStep[] };

function when(iso: string | null) {
  return iso ? `${fmtDay(iso)} ${fmtTime(iso)}` : "never";
}

function minutesAgo(iso: string | null) {
  if (!iso) return null;
  return Math.round((Date.now() - Date.parse(iso)) / 60000);
}

export default async function LudusTab({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; n?: string; seen?: string; stale?: string; msg?: string }>;
}) {
  const me = await requireAdmin();
  const canEdit = me.role === "admin" || me.role === "editor";
  const { ok, error, n, seen, stale, msg } = await searchParams;
  const admin = createAdminClient();

  let settings: LudusSettings | null = null;
  let jobs: JobWithRow[] = [];
  let pendingRows: LudusRow[] = [];
  if (admin) {
    const [s, j, r] = await Promise.all([
      admin.from("ludus_settings").select("*").eq("id", 1).single(),
      admin
        .from("ludus_jobs")
        .select("*, ludus_rows(*), ludus_job_steps(*)")
        .order("created_at", { ascending: false })
        .limit(200),
      admin.from("ludus_rows").select("*").in("status", ["new", "interpreting", "error"]).order("row_number"),
    ]);
    settings = (s.data as LudusSettings | null) ?? null;
    jobs = ((j.data as JobWithRow[] | null) ?? []).map((job) => ({
      ...job,
      ludus_job_steps: [...(job.ludus_job_steps ?? [])].sort((a, b) => a.step_no - b.step_no),
    }));
    pendingRows = (r.data as LudusRow[] | null) ?? [];
  }

  const publicUrl = (path: string) => admin!.storage.from(SCREENSHOT_BUCKET).getPublicUrl(path).data.publicUrl;
  const by = (statuses: string[]) => jobs.filter((j) => statuses.includes(j.status));
  const proposed = by(["proposed"]);
  const queued = by(["approved", "running"]);
  const done = by(["done"]);
  const failed = by(["failed"]);
  const closed = by(["rejected"]);

  const workerAge = minutesAgo(settings?.worker_last_seen_at ?? null);
  const workerOffline = workerAge === null || workerAge > 45;

  return (
    <>
      <h1 className={styles.h1}>Dashboard</h1>
      <AdminTabs active="ludus" role={me.role} />

      {ok && OK[ok] && (
        <div className={styles.ok}>
          {OK[ok]}
          {ok === "synced" && ` ${n ?? 0} new row${n === "1" ? "" : "s"}, ${seen ?? 0} in the sheet, ${stale ?? 0} removed.`}
        </div>
      )}
      {error && (
        <div className={styles.error}>
          {ERR[error] ?? "Something went wrong."}
          {error === "spec" && msg && ` ${msg}`}
        </div>
      )}
      {!admin && (
        <div className={styles.error}>
          Not connected to Supabase. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> in the environment.
        </div>
      )}

      <section className={styles.card} style={{ maxWidth: 860 }}>
        <h2 className={styles.h}>Google Sheet</h2>
        <p className={styles.muted}>
          Share the sheet as <strong>Anyone with the link can view</strong>, paste the link here, then Sync.
          The first row must be column headings. Each other row becomes something to create in Ludus.
        </p>
        <form action={saveSheetUrl} className={styles.form}>
          <label className={styles.label} htmlFor="sheet_url">Sheet link</label>
          <input
            id="sheet_url"
            name="sheet_url"
            className={styles.input}
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/…/edit#gid=0"
            defaultValue={settings?.sheet_url ?? ""}
            disabled={!canEdit}
          />
          <div className={styles.rowActions}>
            {canEdit && <button className={styles.btn} type="submit">Save link</button>}
          </div>
        </form>
        <div className={styles.rowActions} style={{ marginTop: 12 }}>
          {canEdit && (
            <form action={syncSheetNow}>
              <button className={styles.btn} type="submit" disabled={!settings?.sheet_url}>Sync now</button>
            </form>
          )}
          <span className={styles.muted}>
            Last sync: {when(settings?.last_synced_at ?? null)}
            {settings?.last_sync_rows != null && ` · ${settings.last_sync_rows} rows`}
          </span>
        </div>
        {settings?.last_sync_error && <div className={styles.inlineError}>{settings.last_sync_error}</div>}

        <h2 className={styles.h} style={{ marginTop: 20 }}>Worker</h2>
        <p className={styles.muted}>
          The worker runs on the dgxbox at home, checks in every few minutes, interprets new rows with a local AI
          model, and creates approved items in Ludus.
        </p>
        <p>
          <span className={styles.badge}>{workerOffline ? "offline" : settings?.worker_status === "needs_attention" ? "needs attention" : "online"}</span>{" "}
          Last seen {when(settings?.worker_last_seen_at ?? null)}
          {settings?.worker_version && ` · v${settings.worker_version}`}
        </p>
        {settings?.worker_message && <div className={styles.inlineError}>{settings.worker_message}</div>}
      </section>

      {pendingRows.length > 0 && (
        <section className={styles.card} style={{ maxWidth: 860 }}>
          <h2 className={styles.h}>Waiting for the interpreter ({pendingRows.length})</h2>
          <ul className={styles.showList}>
            {pendingRows.map((r) => (
              <li key={r.id} className={styles.showItem}>
                <div className={styles.showHead}>
                  <strong>Row {r.row_number}</strong>
                  <span className={styles.badge}>{r.status}</span>
                </div>
                <RowValues raw={r.raw} />
                {r.error && <div className={styles.inlineError}>{r.error}</div>}
                {canEdit && r.status === "error" && (
                  <form action={reinterpretRow} className={styles.rowActions}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className={styles.btn} type="submit">Try again</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.card} style={{ maxWidth: 860 }}>
        <h2 className={styles.h}>Needs your review ({proposed.length})</h2>
        {proposed.length === 0 ? (
          <p className={styles.muted}>Nothing waiting. Sync the sheet to pull in new rows.</p>
        ) : (
          <ul className={styles.showList}>
            {proposed.map((j) => (
              <li key={j.id} className={styles.showItem}>
                <JobHeader job={j} />
                {j.ludus_rows && <RowValues raw={j.ludus_rows.raw} />}
                {j.notes && <p className={styles.hint}>{j.notes}</p>}
                {canEdit ? (
                  <>
                    <form action={approveJob} className={styles.form}>
                      <input type="hidden" name="id" value={j.id} />
                      {j.kind !== "skip" && (
                        <>
                          <label className={styles.label} htmlFor={`spec-${j.id}`}>What will be created (edit before approving if needed)</label>
                          <textarea
                            id={`spec-${j.id}`}
                            name="spec"
                            className={styles.textarea}
                            rows={Math.min(24, JSON.stringify(j.spec, null, 2).split("\n").length + 1)}
                            defaultValue={JSON.stringify(j.spec, null, 2)}
                            spellCheck={false}
                          />
                        </>
                      )}
                      <div className={styles.rowActions}>
                        {j.kind !== "skip" && <button className={styles.btn} type="submit">Approve &amp; create in Ludus</button>}
                      </div>
                    </form>
                    <div className={styles.rowActions}>
                      <form action={rejectJob}>
                        <input type="hidden" name="id" value={j.id} />
                        <button className={styles.del} type="submit">{j.kind === "skip" ? "Dismiss" : "Reject"}</button>
                      </form>
                      {j.row_id && (
                        <form action={reinterpretRow}>
                          <input type="hidden" name="id" value={j.row_id} />
                          <button className={styles.linkBtn} type="submit">Re-interpret row</button>
                        </form>
                      )}
                    </div>
                  </>
                ) : (
                  <pre className={styles.hint}>{JSON.stringify(j.spec, null, 2)}</pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {queued.length > 0 && (
        <section className={styles.card} style={{ maxWidth: 860 }}>
          <h2 className={styles.h}>Approved, waiting for the worker ({queued.length})</h2>
          <ul className={styles.showList}>
            {queued.map((j) => (
              <li key={j.id} className={styles.showItem}>
                <JobHeader job={j} />
                <p className={styles.muted}>
                  Approved by {j.approved_by ?? "?"} {when(j.approved_at)}
                  {j.status === "running" && ` · running since ${when(j.started_at)}`}
                </p>
                {canEdit && j.status === "approved" && (
                  <form action={rejectJob} className={styles.rowActions}>
                    <input type="hidden" name="id" value={j.id} />
                    <button className={styles.del} type="submit">Cancel</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {failed.length > 0 && (
        <section className={styles.card} style={{ maxWidth: 860 }}>
          <h2 className={styles.h}>Failed ({failed.length})</h2>
          <ul className={styles.showList}>
            {failed.map((j) => (
              <li key={j.id} className={styles.showItem}>
                <JobHeader job={j} />
                <div className={styles.inlineError}>{j.error}</div>
                <Steps job={j} publicUrl={publicUrl} />
                {canEdit && (
                  <div className={styles.rowActions}>
                    <form action={approveJob}>
                      <input type="hidden" name="id" value={j.id} />
                      <button className={styles.btn} type="submit">Retry</button>
                    </form>
                    <form action={rejectJob}>
                      <input type="hidden" name="id" value={j.id} />
                      <button className={styles.del} type="submit">Give up</button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {done.length > 0 && (
        <section className={styles.card} style={{ maxWidth: 860 }}>
          <h2 className={styles.h}>Created in Ludus ({done.length})</h2>
          <ul className={styles.showList}>
            {done.map((j) => (
              <li key={j.id} className={styles.showItem}>
                <JobHeader job={j} />
                <p className={styles.muted}>Finished {when(j.finished_at)}. Created <strong>Off</strong> — turn it On in Ludus when ready.</p>
                {j.result?.links && (
                  <ul>
                    {Object.entries(j.result.links).map(([label, href]) => (
                      <li key={label}><a href={href} target="_blank" rel="noopener">{label}</a></li>
                    ))}
                  </ul>
                )}
                <Steps job={j} publicUrl={publicUrl} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {closed.length > 0 && (
        <details className={styles.helpBox} style={{ maxWidth: 860 }}>
          <summary>Rejected and dismissed ({closed.length})</summary>
          <ul className={styles.showList}>
            {closed.map((j) => (
              <li key={j.id} className={styles.showItem}>
                <JobHeader job={j} />
                {j.notes && <p className={styles.hint}>{j.notes}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function JobHeader({ job }: { job: JobWithRow }) {
  const title =
    (job.spec as { name?: string })?.name ||
    (job.ludus_rows ? `Row ${job.ludus_rows.row_number}` : "Job");
  return (
    <div className={styles.showHead}>
      <strong>{title}</strong>
      <span className={styles.badge}>{job.kind}</span>
      {job.confidence != null && <span className={styles.muted}>confidence {Math.round(job.confidence * 100)}%</span>}
      {job.ludus_rows && <span className={styles.muted}>sheet row {job.ludus_rows.row_number}</span>}
    </div>
  );
}

function RowValues({ raw }: { raw: Record<string, string> }) {
  const entries = Object.entries(raw).filter(([, v]) => v);
  if (entries.length === 0) return null;
  return (
    <dl className={styles.hint} style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "2px 12px", margin: "8px 0" }}>
      {entries.map(([k, v]) => (
        <div key={k} style={{ display: "contents" }}>
          <dt style={{ opacity: 0.7 }}>{k}</dt>
          <dd style={{ margin: 0 }}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Steps({ job, publicUrl }: { job: JobWithRow; publicUrl: (p: string) => string }) {
  if (!job.ludus_job_steps.length) return null;
  return (
    <details>
      <summary className={styles.muted}>{job.ludus_job_steps.length} steps with screenshots</summary>
      <ol>
        {job.ludus_job_steps.map((s) => (
          <li key={s.id}>
            {s.label}
            {s.screenshot_path && (
              <>
                {" "}
                <a href={publicUrl(s.screenshot_path)} target="_blank" rel="noopener">screenshot</a>
              </>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}
