import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminTabs from "@/app/admin/AdminTabs";
import AddBoardMemberToggle from "@/app/admin/AddBoardMemberToggle";
import BoardMemberListItem from "@/app/admin/BoardMemberListItem";
import styles from "../../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Board Members · CHS CHAOS Admin" };

type Person = {
  id: string;
  name: string;
  role: string;
  email: string | null;
  image_url: string | null;
};

const OK: Record<string, string> = {
  added: "Board member added.",
  updated: "Board member updated.",
  deleted: "Deleted.",
};
const ERR: Record<string, string> = {
  nodb: "Supabase service-role key isn't configured (SUPABASE_SERVICE_ROLE_KEY).",
  name: "A name is required.",
  role: "A title is required.",
  save: "Could not save the board member.",
};

export default async function BoardTab({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const admin = createAdminClient();

  let people: Person[] = [];
  if (admin) {
    // eslint-disable-next-line react-hooks/purity -- temporary perf diagnostic
    const t0 = Date.now();
    const { data } = await admin
      .from("people")
      .select("id, name, role, email, image_url")
      .eq("group_name", "board")
      .order("sort_order", { ascending: true });
    // eslint-disable-next-line react-hooks/purity -- temporary perf diagnostic
    console.log(`[perf] /admin/board people query: ${Date.now() - t0}ms`);
    people = (data as Person[] | null) ?? [];
  }

  return (
    <>
      <h1 className={styles.h1}>Dashboard</h1>
      <AdminTabs active="board" />

      {ok && OK[ok] && <div className={styles.ok}>{OK[ok]}</div>}
      {error && <div className={styles.error}>{ERR[error] ?? "Something went wrong."}</div>}
      {!admin && (
        <div className={styles.error}>
          Not connected to Supabase. Set <code>NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          and <code>SUPABASE_SERVICE_ROLE_KEY</code> in the environment.
        </div>
      )}

      <section className={styles.card} style={{ maxWidth: 640 }}>
        <AddBoardMemberToggle />

        {people.length === 0 ? (
          <p className={styles.muted}>No board members yet.</p>
        ) : (
          <ul className={styles.eventList}>
            {people.map((p) => (
              <BoardMemberListItem key={p.id} person={p} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
