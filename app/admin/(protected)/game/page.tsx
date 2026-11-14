import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminTabs from "@/app/admin/AdminTabs";
import { endRehearsalAction, setHiddenAction, startRehearsalAction } from "@/app/admin/game-actions";
import styles from "../../admin.module.css";
import { isLive } from "@/lib/game-window";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lobby Game · CHS CHAOS Admin" };

const OK: Record<string, string> = {
  started: "Rehearsal started. It's live on /play for 30 minutes.",
  ended: "Rehearsal ended and its results deleted.",
  hidden: "Name hidden from the board.",
  shown: "Name back on the board.",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    timeZone: "America/New_York",
  });

type Player = { id: string; name: string; score: number; hidden: boolean };
type Session = {
  id: string; label: string | null; is_rehearsal: boolean; opens_at: string; closes_at: string; curtain_at: string | null;
  production: { title: string }; game_players: Player[];
};

export default async function GameAdmin({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const me = await requireAdmin();
  const canEdit = me.role === "admin" || me.role === "editor";
  const { ok, error } = await searchParams;
  const db = createAdminClient();

  const { data: prods } = db
    ? await db.from("productions").select("id, title").eq("has_game", true).order("sort_order")
    : { data: [] };
  const { data: sess } = db
    ? await db
        .from("game_sessions")
        .select("id, label, is_rehearsal, opens_at, closes_at, curtain_at, production:productions(title), game_players(id, name, score, hidden)")
        .order("opens_at", { ascending: false })
        .limit(8)
    : { data: [] };
  const sessions = (sess ?? []) as unknown as Session[];
  // eslint-disable-next-line react-hooks/purity -- request-time render (force-dynamic)
  const now = Date.now();

  return (
    <>
      <h1 className={styles.h1}>Dashboard</h1>
      <AdminTabs active="game" role={me.role} />
      {ok && OK[ok] && <div className={styles.ok}>{OK[ok]}</div>}
      {error && <div className={styles.error}>Something went wrong.</div>}

      <section className={styles.card} style={{ maxWidth: 720 }}>
        <p className={styles.muted}>
          Every performance of a show with <b>Lobby game</b> checked opens a session on{" "}
          <Link href="/play">/play</Link> all day on the show day (midnight to 11:59pm Eastern), paused from curtain until 90 minutes after. Results
          are kept. Use a rehearsal to test with real phones; rehearsal results are never shown or kept.
        </p>
        {canEdit &&
          (prods ?? []).map((p) => (
            <form key={p.id} action={startRehearsalAction} style={{ marginTop: 8 }}>
              <input type="hidden" name="production_id" value={p.id} />
              <button className={styles.btn}>Start 30-min rehearsal: {p.title}</button>
            </form>
          ))}
      </section>

      {sessions.map((s) => {
        const live = isLive(s, now);
        const players = [...s.game_players].sort((a, b) => b.score - a.score);
        return (
          <section key={s.id} className={styles.card} style={{ maxWidth: 720, marginTop: 16 }}>
            <h2 style={{ margin: 0 }}>
              {s.production.title} · {s.is_rehearsal ? "Rehearsal" : (s.label ?? "")} · {when(s.opens_at)}
              {live && " · LIVE"}
            </h2>
            <p className={styles.muted}>{players.length} players</p>
            {canEdit && s.is_rehearsal && (
              <form action={endRehearsalAction}>
                <input type="hidden" name="id" value={s.id} />
                <button className={styles.btn}>End and delete rehearsal</button>
              </form>
            )}
            <ol className={styles.eventList}>
              {players.map((p) => (
                <li key={p.id} className={styles.eventItem} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ flex: 1, textDecoration: p.hidden ? "line-through" : undefined }}>
                    {p.name}
                  </span>
                  <span>{p.score}</span>
                  {canEdit && (
                    <form action={setHiddenAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="hidden" value={String(!p.hidden)} />
                      <button className={styles.delSmall}>{p.hidden ? "Show" : "Hide"}</button>
                    </form>
                  )}
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </>
  );
}
