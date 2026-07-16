import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createShow, deleteShow } from "@/app/admin/actions";
import ShowFormFields from "@/app/admin/ShowFormFields";
import AdminTabs from "@/app/admin/AdminTabs";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · CHS CHAOS" };

type Row = {
  id: string;
  slug: string;
  program: string;
  title: string;
  sort_order: number;
};

const OK: Record<string, string> = {
  show: "Show created.",
  updated: "Show updated.",
  deleted: "Deleted.",
};
const ERR: Record<string, string> = {
  nodb: "Supabase service-role key isn't configured (SUPABASE_SERVICE_ROLE_KEY).",
  title: "A title is required.",
  program: "Choose Theatre or Choir.",
  dupe: "A show with that slug already exists — pick a different title/slug.",
  show: "Could not create the show.",
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
    // eslint-disable-next-line react-hooks/purity -- temporary perf diagnostic
    const t0 = Date.now();
    const { data } = await admin
      .from("productions")
      .select("id, slug, program, title, sort_order")
      .order("sort_order", { ascending: true });
    // eslint-disable-next-line react-hooks/purity -- temporary perf diagnostic
    console.log(`[perf] /admin productions query: ${Date.now() - t0}ms`);
    shows = (data as Row[] | null) ?? [];
  }

  return (
    <>
      <h1 className={styles.h1}>Dashboard</h1>
      <AdminTabs active="shows" />

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

        {/* SHOWS LIST */}
        <section className={styles.card}>
          <h2 className={styles.h2}>Your shows</h2>
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
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
