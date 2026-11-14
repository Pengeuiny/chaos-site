import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductionBySlug } from "@/lib/queries";
import { getBoard, getPlayState } from "@/lib/game";
import LiveBoard from "@/app/play/LiveBoard";
import DaedaCredit from "@/app/play/DaedaCredit";
import { decoFonts } from "@/app/play/fonts";
import HeadshotCloud, { type CloudPerson } from "./HeadshotCloud";
import s from "./gatsby.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "The Great Gatsby · Cuthbertson High School Theatre",
  description:
    "Cuthbertson High School Theatre presents The Great Gatsby, November 12–14, 2026. Meet the company, get tickets, and play the lobby game.",
};

const SLUG = "the-great-gatsby";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });

/** Split an ensemble name list ("A, B & C") into names. */
const names = (list: string | null) =>
  (list ?? "").split(/,\s*|\s*&\s*/).map((n) => n.replace(/\*/g, "").trim()).filter(Boolean);

export default async function GatsbyPage() {
  const p = await getProductionBySlug(SLUG);
  if (!p) notFound();

  const cast = p.cast_members.filter((c) => !c.is_crew && !c.is_group);
  const groups = p.cast_members.filter((c) => c.is_group);
  const crew = p.cast_members.filter((c) => c.is_crew);
  const shows = p.showtimes.filter((t) => t.is_performance && t.starts_at);

  // One bubble per person, every role they hold. Cast first, then ensemble, then crew.
  const people = new Map<string, CloudPerson>();
  const add = (name: string, role: string, lead = false) => {
    const cur = people.get(name) ?? { name, roles: [], lead: false };
    if (!cur.roles.includes(role)) cur.roles.push(role);
    cur.lead ||= lead;
    people.set(name, cur);
  };
  cast.forEach((c) => c.actor && add(c.actor, c.role, c.is_lead));
  groups.forEach((g) => names(g.actor).forEach((n) => add(n, "Ensemble")));
  crew.forEach((c) => c.actor && add(c.actor, c.role));

  // eslint-disable-next-line react-hooks/purity -- request-time render (force-dynamic)
  const serverNow = Date.now();
  const state = await getPlayState(serverNow);
  const mine = state.production?.id === p.id;
  const board = await getBoard(p.id, mine ? (state.current?.id ?? null) : null);

  return (
    <div className={`${s.root} ${decoFonts}`}>
      <div className={s.glow} aria-hidden />

      <nav className={s.topbar}>
        <Link href="/" className={s.back}>← CHS CHAOS</Link>
        <a href="#game" className={s.topPlay}>Lobby Game</a>
      </nav>

      <header className={s.hero}>
        <div className={s.poster}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gatsby/cover.jpg" alt="The Great Gatsby poster: Gatsby on the dock, raising a glass toward the green light" />
        </div>
        <div className={s.heroText}>
          <p className={s.kicker}>Cuthbertson High School Theatre presents</p>
          <h1 className={s.title}>The Great Gatsby</h1>
          <p className={s.dates}>November 12–14, 2026 · {p.venue ?? "CHS Auditorium"}</p>
          {p.ticket_url && (
            <a className={s.btn} href={p.ticket_url} target="_blank" rel="noopener">
              Get Tickets
            </a>
          )}
        </div>
      </header>

      <main className={s.wrap}>
        {shows.length > 0 && (
          <section className={s.section}>
            <h2 className={s.h2}><span>Performances</span></h2>
            <ul className={s.shows}>
              {shows.map((t) => (
                <li key={t.id} className={s.show}>
                  <span>{when(t.starts_at!)}</span>
                  {(t.ticket_url || p.ticket_url) && (
                    <a href={(t.ticket_url || p.ticket_url)!} target="_blank" rel="noopener">Tickets</a>
                  )}
                </li>
              ))}
            </ul>
            <p className={s.note}>The lobby game is open all day on show days, paused during the show.</p>
          </section>
        )}

        {p.synopsis && (
          <section className={s.section}>
            <h2 className={s.h2}><span>The Story</span></h2>
            <p className={s.synopsis}>{p.synopsis}</p>
          </section>
        )}

        <section className={s.section}>
          <h2 className={s.h2}><span>The Company</span></h2>
          <p className={s.note}>Tap anyone to see who they are.</p>
          <HeadshotCloud people={[...people.values()]} />
        </section>

        <section className={s.section}>
          <h2 className={s.h2}><span>Cast</span></h2>
          <dl className={s.list}>
            {cast.map((c) => (
              <div key={c.id} className={s.line}>
                <dt>{c.role}</dt>
                <span className={s.dots} aria-hidden />
                <dd>{c.actor}</dd>
              </div>
            ))}
          </dl>
          {groups.map((g) => (
            <div key={g.id} className={s.group}>
              <h3 className={s.h3}>{g.role}</h3>
              <ul className={s.names}>
                {names(g.actor).map((n) => <li key={n}>{n}</li>)}
              </ul>
            </div>
          ))}
        </section>

        {crew.length > 0 && (
          <section className={s.section}>
            <h2 className={s.h2}><span>Production Crew</span></h2>
            <dl className={s.list}>
              {crew.map((c) => (
                <div key={c.id} className={s.line}>
                  <dt>{c.role}</dt>
                  <span className={s.dots} aria-hidden />
                  <dd>{c.actor}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section id="game" className={s.section}>
          <h2 className={s.h2}><span>The Lobby Game</span></h2>
          <p className={s.note}>
            Play on your phone any time on a show day. The game pauses when the lights go down and
            comes back at 8:30pm until midnight. Tonight&rsquo;s crowd vs. every other night of the run.
          </p>
          <LiveBoard
            productionId={p.id}
            title="Gatsby"
            session={mine ? state.current : null}
            nextOpensAt={mine ? (state.next?.opens_at ?? null) : null}
            initial={board}
            playHref="/play"
            serverNow={serverNow}
          />
        </section>

        <div className={s.footer}>
          <p>Cuthbertson High School Theatre · Waxhaw, NC</p>
          <DaedaCredit />
        </div>
      </main>
    </div>
  );
}
