import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateShow, deleteShow } from "@/app/admin/actions";
import ShowFormFields from "@/app/admin/ShowFormFields";
import type { Production } from "@/lib/types";
import styles from "../../../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit show · CHS CHAOS" };

const ERR: Record<string, string> = {
  title: "A title is required.",
  program: "Choose Theatre or Choir.",
  dates: "Enter a start and end date, or mark dates as not yet planned.",
  dupe: "That slug is already used by another show — pick a different one.",
  show: "Could not save changes.",
  nodb: "Supabase service-role key isn't configured.",
};

export default async function EditShow({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const admin = createAdminClient();
  if (!admin) {
    return (
      <div className={styles.error}>
        Not connected to Supabase (SUPABASE_SERVICE_ROLE_KEY).
      </div>
    );
  }

  const { data } = await admin
    .from("productions")
    .select("*")
    .eq("id", id)
    .single();
  if (!data) notFound();
  const show = data as Production;

  return (
    <>
      <div className={styles.showHead} style={{ marginBottom: 18 }}>
        <h1 className={styles.h1} style={{ margin: 0 }}>
          Edit: {show.title}
        </h1>
        <Link className={styles.topLink} href="/admin">
          ← Back to dashboard
        </Link>
      </div>

      {error && (
        <div className={styles.error}>{ERR[error] ?? "Something went wrong."}</div>
      )}

      <div className={styles.card} style={{ maxWidth: 640 }}>
        <form action={updateShow} className={styles.form}>
          <input type="hidden" name="id" value={show.id} />
          <ShowFormFields defaults={show} />
          <div className={styles.row2}>
            <button className={styles.btn} type="submit">
              Save changes
            </button>
            <Link
              className={styles.linkBtn}
              href="/admin"
              style={{ textAlign: "center", lineHeight: "2.6" }}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      <form action={deleteShow} style={{ marginTop: 18 }}>
        <input type="hidden" name="id" value={show.id} />
        <button className={styles.del} type="submit">
          Delete this show
        </button>
      </form>
    </>
  );
}
