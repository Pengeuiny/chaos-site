import { MON, parts, fmtTime, rangeFrom } from "@/lib/format";
import type { ProductionWithDetails } from "@/lib/types";
import SmartImg from "@/app/components/SmartImg";

/**
 * Shared "event" layout: poster on the left spanning the full height, title
 * + date range top-right, and an info card below the title with
 * description, cast, and one ticket chip per performance. Used for both the
 * homepage hero's featured production and the show detail page.
 */
export default function EventHero({
  production: p,
  eyebrow,
}: {
  production: ProductionWithDetails;
  eyebrow?: string;
}) {
  const dates = p.date_range || rangeFrom(p.showtimes);
  const accent = p.accent || "#173568";

  const titleArt = (
    <div
      className="event-media-fallback"
      style={{ background: `linear-gradient(150deg,${accent},#0c0307)` }}
    >
      <span>{p.title}</span>
    </div>
  );

  return (
    <div className="event-hero">
      <div className="event-media">
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

      <div className="event-head">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{p.title}</h2>
        {p.title_note && (
          <div className="title-note">
            ★ Working title — update in the data layer
          </div>
        )}
        <div className="dates">{dates}</div>
      </div>

      <div className="event-card">
        {p.tagline && <p className="tagline">{p.tagline}</p>}
        {p.synopsis && <p className="syn">{p.synopsis}</p>}

        {p.cast_members.length > 0 && (
          <>
            {p.cast_is_sample && (
              <div className="cast-note">
                ★ Sample cast — replace in the data layer once the cast list
                is posted.
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
          </>
        )}

        {p.showtimes.length > 0 && (
          <div className="chips">
            {p.showtimes.map((st) => {
              const t = parts(st.starts_at);
              const href = st.ticket_url || p.ticket_url;
              const label = `${st.label ? `${st.label} — ` : ""}${MON[t.month]} ${t.day} · ${fmtTime(st.starts_at)}`;
              return href ? (
                <a
                  key={st.id}
                  className="chip"
                  href={href}
                  target="_blank"
                  rel="noopener"
                >
                  🎟 {label}
                </a>
              ) : (
                <span key={st.id} className="chip disabled">
                  {label}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
