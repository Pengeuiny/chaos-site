import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductionBySlug } from "@/lib/queries";
import { PASSES } from "@/lib/links";
import EventHero from "@/app/components/EventHero";

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

  return (
    <section className="detail">
      <div className="wrap">
        <Link className="back" href="/#season">
          ← Back to the season
        </Link>

        <EventHero production={p} />

        {(p.venue || p.address || p.ticket_url || p.has_microsite) && (
          <div className="event-extra">
            {(p.venue || p.address) && (
              <div className="pb-meta">
                {p.venue && (
                  <div className="mi">
                    <div className="lab">Location</div>
                    <div className="val">{p.venue}</div>
                  </div>
                )}
                {p.address && (
                  <div className="mi">
                    <div className="lab">Address</div>
                    <div className="val">{p.address}</div>
                  </div>
                )}
              </div>
            )}
            <div className="pb-cta">
              {p.ticket_url && (
                <a
                  className="btn btn-primary cta-glow"
                  href={p.ticket_url}
                  target="_blank"
                  rel="noopener"
                >
                  🎟 All ticket info
                </a>
              )}
              <a
                className="btn btn-gold cta-glow"
                href={PASSES}
                target="_blank"
                rel="noopener"
              >
                Member Pre-Sale
              </a>
              {p.has_microsite && (
                <Link className="btn btn-ghost" href="/nemo">
                  🌊 Open Microsite ↗
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="detail-stage">
          <div className="marquee">
            {p.title} &nbsp;★&nbsp; {p.title} &nbsp;★&nbsp;
          </div>
        </div>
      </div>
    </section>
  );
}
