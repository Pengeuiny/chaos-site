import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { toEasternLocalInput } from "@/lib/format";
import AdminTabs from "@/app/admin/AdminTabs";
import AddEventToggle from "@/app/admin/AddEventToggle";
import EventListItem from "@/app/admin/EventListItem";
import styles from "../../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Events · CHS CHAOS Admin" };

type Row = {
  id: string;
  title: string;
  showtimes: {
    id: string;
    starts_at: string;
    label: string | null;
    ticket_url: string | null;
    sort_order: number;
  }[];
};

const OK: Record<string, string> = {
  event: "Event saved.",
  deleted: "Deleted.",
};
const ERR: Record<string, string> = {
  nodb: "Supabase service-role key isn't configured (SUPABASE_SERVICE_ROLE_KEY).",
  prod: "Pick a show for the event.",
  when: "Pick a date & time for the event.",
  event: "Could not save the event.",
};

export default async function EventsTab({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const admin = createAdminClient();

  let shows: Row[] = [];
  if (admin) {
    // eslint-disable-next-line react-hooks/purity -- temporary perf diagnostic
    const t0 = Date.now();
    const { data } = await admin
      .from("productions")
      .select(
        "id, title, showtimes(id, starts_at, label, ticket_url, sort_order)",
      )
      .order("sort_order", { ascending: true });
    // eslint-disable-next-line react-hooks/purity -- temporary perf diagnostic
    console.log(`[perf] /admin/events productions+showtimes query: ${Date.now() - t0}ms`);
    shows = (data as Row[] | null) ?? [];
  }

  return (
    <>
      <h1 className={styles.h1}>Dashboard</h1>
      <AdminTabs active="events" />

      {ok && OK[ok] && <div className={styles.ok}>{OK[ok]}</div>}
      {error && <div className={styles.error}>{ERR[error] ?? "Something went wrong."}</div>}
      {!admin && (
        <div className={styles.error}>
          Not connected to Supabase. Set <code>NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          and <code>SUPABASE_SERVICE_ROLE_KEY</code> in the environment.
        </div>
      )}

      <section className={styles.card} style={{ maxWidth: 720 }}>
        <AddEventToggle shows={shows.map((s) => ({ id: s.id, title: s.title }))} />

        <details className={styles.helpBox} style={{ margin: "16px 0" }}>
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
              Paste that link into the Ticket URL field above (or when
              editing an existing date below).
            </li>
          </ol>
          <p style={{ margin: "10px 0 0" }}>
            If a show doesn&rsquo;t sell tickets per-date yet (e.g.
            registration-only camps), leave Ticket URL blank — the date will
            still show, just without a buy link.
          </p>
        </details>

        {shows.length === 0 ? (
          <p className={styles.muted}>No shows yet.</p>
        ) : (
          <ul className={styles.showList}>
            {shows.map((s) => (
              <li key={s.id} className={styles.showItem}>
                <div className={styles.showHead}>
                  <strong>{s.title}</strong>
                </div>
                {s.showtimes.length > 0 ? (
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
                ) : (
                  <p className={styles.muted} style={{ margin: "8px 0 0" }}>
                    No events yet.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
