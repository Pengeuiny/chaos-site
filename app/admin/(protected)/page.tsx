import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDay, fmtTime } from "@/lib/format";
import { createShow, addEvent, deleteEvent, deleteShow } from "@/app/admin/actions";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · CHS CHAOS" };

type Row = {
  id: string;
  slug: string;
  program: string;
  title: string;
  sort_order: number;
  showtimes: { id: string; starts_at: string; label: string | null }[];
};

const OK: Record<string, string> = {
  show: "Show created.",
  event: "Event added to the calendar.",
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
      .select("id, slug, program, title, sort_order, showtimes(id, starts_at, label)")
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
            <label className={styles.label}>
              Title *
              <input className={styles.input} name="title" required />
            </label>

            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Program *</legend>
              <label className={styles.radio}>
                <input type="radio" name="program" value="theatre" defaultChecked />
                Theatre
              </label>
              <label className={styles.radio}>
                <input type="radio" name="program" value="choir" />
                Choir / Chorus
              </label>
            </fieldset>

            <div className={styles.row2}>
              <label className={styles.label}>
                Slug <span className={styles.hint}>(optional)</span>
                <input className={styles.input} name="slug" placeholder="auto from title" />
              </label>
              <label className={styles.label}>
                Type
                <input className={styles.input} name="type" placeholder="Mainstage Musical" />
              </label>
            </div>

            <div className={styles.row2}>
              <label className={styles.label}>
                Tag text
                <input className={styles.input} name="tag_text" placeholder="On Sale" />
              </label>
              <label className={styles.label}>
                Tag style
                <select className={styles.input} name="tag_class" defaultValue="onsale">
                  <option value="onsale">On Sale (gold)</option>
                  <option value="upcoming">Upcoming (pink)</option>
                  <option value="camp">Camp (teal)</option>
                  <option value="past">Past (grey)</option>
                </select>
              </label>
            </div>

            <div className={styles.row2}>
              <label className={styles.label}>
                Accent color
                <input className={styles.input} type="color" name="accent" defaultValue="#b11e37" />
              </label>
              <label className={styles.label}>
                Sort order
                <input className={styles.input} type="number" name="sort_order" defaultValue={0} />
              </label>
            </div>

            <label className={styles.label}>
              Venue
              <input className={styles.input} name="venue" placeholder="Cuthbertson High School Auditorium" />
            </label>
            <label className={styles.label}>
              Address
              <input className={styles.input} name="address" placeholder="1520 Cuthbertson Rd, Waxhaw, NC 28173" />
            </label>
            <label className={styles.label}>
              Date range <span className={styles.hint}>(display label)</span>
              <input className={styles.input} name="date_range" placeholder="April 16–18, 2026" />
            </label>
            <label className={styles.label}>
              Tagline
              <input className={styles.input} name="tagline" />
            </label>
            <label className={styles.label}>
              Synopsis
              <textarea className={styles.textarea} name="synopsis" rows={4} />
            </label>

            <div className={styles.row2}>
              <label className={styles.label}>
                Ticket URL
                <input className={styles.input} name="ticket_url" placeholder="https://…" />
              </label>
              <label className={styles.label}>
                Poster URL
                <input className={styles.input} name="poster_url" placeholder="https://…" />
              </label>
            </div>

            <label className={styles.check}>
              <input type="checkbox" name="has_microsite" /> Has a microsite
            </label>
            <label className={styles.check}>
              <input type="checkbox" name="cast_is_sample" /> Cast list is a sample
            </label>

            <button className={styles.btn} type="submit">
              Create show
            </button>
          </form>
        </section>

        {/* ADD EVENT */}
        <section className={styles.card}>
          <h2 className={styles.h2}>Add a calendar event</h2>
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
                    <form action={deleteShow}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className={styles.del} type="submit" title="Delete show">
                        Delete
                      </button>
                    </form>
                  </div>
                  {s.showtimes.length > 0 && (
                    <ul className={styles.eventList}>
                      {[...s.showtimes]
                        .sort((a, b) => (a.starts_at < b.starts_at ? -1 : 1))
                        .map((e) => (
                          <li key={e.id} className={styles.eventItem}>
                            <span>
                              {fmtDay(e.starts_at)} · {fmtTime(e.starts_at)}
                              {e.label ? ` — ${e.label}` : ""}
                            </span>
                            <form action={deleteEvent}>
                              <input type="hidden" name="id" value={e.id} />
                              <button className={styles.delSmall} type="submit">
                                ✕
                              </button>
                            </form>
                          </li>
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
