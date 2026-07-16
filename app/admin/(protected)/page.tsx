import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { toEasternLocalInput } from "@/lib/format";
import { createShow, addEvent, deleteShow } from "@/app/admin/actions";
import ShowFormFields from "@/app/admin/ShowFormFields";
import EventListItem from "@/app/admin/EventListItem";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · CHS CHAOS" };

type Row = {
  id: string;
  slug: string;
  program: string;
  title: string;
  sort_order: number;
  showtimes: {
    id: string;
    starts_at: string;
    label: string | null;
    ticket_url: string | null;
    sort_order: number;
  }[];
};

const OK: Record<string, string> = {
  show: "Show created.",
  updated: "Show updated.",
  event: "Event saved.",
  deleted: "Deleted.",
};
const ERR: Record<string, string> = {
  nodb: "Supabase service-role key isn't configured (SUPABASE_SERVICE_ROLE_KEY).",
  title: "A title is required.",
  program: "Choose Theatre or Choir.",
  dupe: "A show with that slug already exists — pick a different title/slug.",
  show: "Could not create the show.",
  prod: "Pick a show for the event.",
  when: "Pick a date & time for the event.",
  event: "Could not add the event.",
};

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const admin = createAdminClient();

  let shows: Row[] = [];
  if (admin) {
    const { data } = await admin
      .from("productions")
      .select(
        "id, slug, program, title, sort_order, showtimes(id, starts_at, label, ticket_url, sort_order)",
      )
      .order("sort_order", { ascending: true });
    shows = (data as Row[] | null) ?? [];
  }

  return (
    <>
      <h1 className={styles.h1}>Dashboard</h1>

      {ok && OK[ok] && <div className={styles.ok}>{OK[ok]}</div>}
      {error && <div className={styles.error}>{ERR[error] ?? "Something went wrong."}</div>}
      {!admin && (
        <div className={styles.error}>
          Not connected to Supabase. Set <code>NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          and <code>SUPABASE_SERVICE_ROLE_KEY</code> in the environment.
        </div>
      )}

      <div className={styles.grid}>
        {/* CREATE SHOW */}
        <section className={styles.card}>
          <h2 className={styles.h2}>Create a show</h2>
          <form action={createShow} className={styles.form}>
            <ShowFormFields />
            <button className={styles.btn} type="submit">
              Create show
            </button>
          </form>
        </section>

        {/* ADD EVENT */}
        <section className={styles.card}>
          <h2 className={styles.h2}>Add a calendar event</h2>

          <details className={styles.helpBox} style={{ marginBottom: 16 }}>
            <summary>Where do I get a performance&rsquo;s Ticket URL?</summary>
            <ol>
              <li>
                Open the Ludus tickets page:{" "}
                <code>
                  https://cuthbertsontheatre.ludus.com/index.php?sections=events
                </code>
              </li>
              <li>Click the calendar icon to switch to Calendar view.</li>
              <li>
                Find the performance&rsquo;s date, then right-click it (on
                mobile Safari: tap and hold).
              </li>
              <li>
                Choose <strong>Copy Link Address</strong> (Chrome/Edge) or{" "}
                <strong>Copy Link</strong> (Firefox/Safari).
              </li>
              <li>
                Paste that link into the Ticket URL field below (or when
                editing an existing date).
              </li>
            </ol>
            <p style={{ margin: "10px 0 0" }}>
              If a show doesn&rsquo;t sell tickets per-date yet (e.g.
              registration-only camps), leave Ticket URL blank — the date will
              still show, just without a buy link.
            </p>
          </details>

          {shows.length === 0 ? (
            <p className={styles.muted}>Create a show first — events attach to a show.</p>
          ) : (
            <form action={addEvent} className={styles.form}>
              <label className={styles.label}>
                Show *
                <select className={styles.input} name="production_id" required defaultValue="">
                  <option value="" disabled>
                    Select a show…
                  </option>
                  {shows.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.label}>
                Date &amp; time * <span className={styles.hint}>(Eastern)</span>
                <input className={styles.input} type="datetime-local" name="starts_at" required />
              </label>
              <label className={styles.label}>
                Label
                <input className={styles.input} name="label" placeholder="Opening Night" />
              </label>
              <label className={styles.label}>
                Ticket URL <span className={styles.hint}>(optional)</span>
                <input
                  className={styles.input}
                  name="ticket_url"
                  placeholder="https://…"
                />
              </label>
              <label className={styles.label}>
                Sort order
                <input className={styles.input} type="number" name="sort_order" defaultValue={0} />
              </label>
              <button className={styles.btn} type="submit">
                Add event
              </button>
            </form>
          )}

          <h2 className={styles.h2} style={{ marginTop: 28 }}>
            Shows &amp; events
          </h2>
          {shows.length === 0 ? (
            <p className={styles.muted}>No shows yet.</p>
          ) : (
            <ul className={styles.showList}>
              {shows.map((s) => (
                <li key={s.id} className={styles.showItem}>
                  <div className={styles.showHead}>
                    <div>
                      <strong>{s.title}</strong>{" "}
                      <span className={styles.badge}>{s.program}</span>
                    </div>
                    <div className={styles.rowActions}>
                      <Link className={styles.editLink} href={`/admin/shows/${s.id}`}>
                        Edit
                      </Link>
                      <form action={deleteShow}>
                        <input type="hidden" name="id" value={s.id} />
                        <button className={styles.del} type="submit" title="Delete show">
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                  {s.showtimes.length > 0 && (
                    <ul className={styles.eventList}>
                      {[...s.showtimes]
                        .sort((a, b) => (a.starts_at < b.starts_at ? -1 : 1))
                        .map((e) => (
                          <EventListItem
                            key={e.id}
                            event={e}
                            localInput={toEasternLocalInput(e.starts_at)}
                          />
                        ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
