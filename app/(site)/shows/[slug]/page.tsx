import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductionBySlug } from "@/lib/queries";
import { PASSES } from "@/lib/links";
import { MON, parts, fmtTime, rangeFrom } from "@/lib/format";
import SmartImg from "@/app/components/SmartImg";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductionBySlug(slug);
  if (!p) return { title: "Show not found · CHS CHAOS" };
  return {
    title: `${p.title} · CHS CHAOS`,
    description: p.tagline ?? undefined,
  };
}

export default async function ShowDetail({ params }: Props) {
  const { slug } = await params;
  const p = await getProductionBySlug(slug);
  if (!p) notFound();

  const dates = p.date_range || rangeFrom(p.showtimes);
  const accent = p.accent || "#7c1326";

  const titleArt = (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        height: "100%",
        color: "rgba(246,239,226,.92)",
        fontFamily: "Anton",
        fontSize: 30,
        padding: 24,
        textAlign: "center",
        textTransform: "uppercase",
      }}
    >
      {p.title}
    </div>
  );

  return (
    <section className="detail">
      <div className="wrap">
        <Link className="back" href="/#season">
          ← Back to the season
        </Link>

        <div className="pb-hero">
          <div
            className="pb-poster"
            style={{ background: `linear-gradient(150deg,${accent},#0c0307)` }}
          >
            {p.poster_url ? (
              <SmartImg
                src={p.poster_url}
                alt={`${p.title} poster`}
                fallback={titleArt}
              />
            ) : (
              titleArt
            )}
          </div>
          <div>
            <div className="type">{p.type}</div>
            <h1>{p.title}</h1>
            {p.title_note && (
              <div
                style={{
                  fontFamily: "'Space Mono'",
                  fontSize: 11,
                  color: "var(--brass-soft)",
                  marginTop: 8,
                }}
              >
                ★ Working title — update in the data layer
              </div>
            )}
            <div className="tagline">{p.tagline}</div>
            <div className="pb-meta">
              <div className="mi">
                <div className="lab">Dates</div>
                <div className="val">{dates}</div>
              </div>
              <div className="mi">
                <div className="lab">Location</div>
                <div className="val">{p.venue}</div>
              </div>
              <div className="mi">
                <div className="lab">Address</div>
                <div className="val">{p.address}</div>
              </div>
            </div>
            <div className="pb-cta">
              {p.ticket_url && (
                <a
                  className="btn btn-primary"
                  href={p.ticket_url}
                  target="_blank"
                  rel="noopener"
                >
                  🎟 Buy Tickets
                </a>
              )}
              <a
                className="btn btn-gold"
                href={PASSES}
                target="_blank"
                rel="noopener"
              >
                Member Pre-Sale
              </a>
              {p.has_microsite && (
                <Link className="btn btn-ghost" href="/nemo">
                  🌊 Open the immersive microsite ↗
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="sec-head" style={{ marginBottom: 14 }}>
          <div>
            <div className="k">Showtimes</div>
            <h2 style={{ fontSize: 30 }}>
              Tear off a <span className="gold">stub</span>
            </h2>
          </div>
        </div>
        <div className="stubs">
          {p.showtimes.map((st) => {
            const t = parts(st.starts_at);
            const Tag = st.ticket_url ? "a" : "div";
            return (
              <Tag
                className={`stub${st.ticket_url ? " ticketable" : ""}`}
                key={st.id}
                {...(st.ticket_url
                  ? { href: st.ticket_url, target: "_blank", rel: "noopener" }
                  : {})}
              >
                <div style={{ textAlign: "center" }}>
                  <div className="dnum">{t.day}</div>
                  <div className="dm">
                    {MON[t.month]} {t.year}
                  </div>
                </div>
                <div className="perf" />
                <div>
                  <div className="dt">{st.label}</div>
                  <div className="dd">
                    {t.weekday} · {fmtTime(st.starts_at)}
                  </div>
                </div>
                {st.ticket_url && <div className="go">🎟 Tickets →</div>}
              </Tag>
            );
          })}
        </div>

        <div className="detail-stage">
          <div className="marquee">
            {p.title} &nbsp;★&nbsp; {p.title} &nbsp;★&nbsp;
          </div>
        </div>

        <div className="sec-head" style={{ marginBottom: 14 }}>
          <div>
            <div className="k">The Story</div>
            <h2 style={{ fontSize: 30 }}>
              About the <span className="gold">show</span>
            </h2>
          </div>
        </div>
        <p className="syn">{p.synopsis}</p>

        {p.cast_members.length > 0 && (
          <section style={{ paddingTop: 10 }}>
            <div className="sec-head" style={{ marginBottom: 16 }}>
              <div>
                <div className="k">Who&rsquo;s On Stage</div>
                <h2 style={{ fontSize: 34 }}>
                  The <span className="gold">Cast</span>
                </h2>
              </div>
            </div>
            {p.cast_is_sample && (
              <div className="cast-note">
                ★ Sample cast — replace in the data layer once the cast list is
                posted.
              </div>
            )}
            <div className="cast">
              {p.cast_members.map((c) => (
                <div className="castrow" key={c.id}>
                  <span className="role">{c.role}</span>
                  <span className="actor">
                    {c.is_lead && <span className="lead">Lead</span>}
                    {c.actor}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
