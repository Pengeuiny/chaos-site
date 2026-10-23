import Link from "next/link";
import type { Metadata } from "next";
import CopyEmail from "./CopyEmail";
import { SPONSOR_EMAIL as EMAIL } from "@/lib/links";

export const metadata: Metadata = {
  title: "Full Season Community Sponsorship · CHS CHAOS",
  description:
    "Put your business in front of Waxhaw, Marvin, and Weddington families at every CHS Theatre & Chorus performance, October through May. Tax-deductible playbill ads from $150.",
};

const PHONE = "312-404-9744";

// The 26-27 season this campaign covers. `playbill: true` = the ad itself
// runs in that show's printed playbill; the rest list sponsors in the
// acknowledgments.
const SEASON = [
  { when: "Oct 26", what: "Fall Coffee & Dessert Chorus Concert" },
  { when: "Nov 12–14", what: "The Great Gatsby", note: "3-night play run", playbill: true },
  { when: "Dec 7", what: "Winter Holiday Concert" },
  { when: "Dec 10–11", what: "Alice by Heart", note: "2-night musical run" },
  { when: "Jan 14", what: "Revue in Reverse Variety Show" },
  { when: "Mar 25", what: "Dream Roles & Nightmares Revue" },
  { when: "Apr 8–10", what: "The Hunchback of Notre Dame", note: "6-night spring musical mainstage", playbill: true },
  { when: "May 11", what: "Theatre I & II Class Production Showcase" },
  { when: "May 15", what: "Senior Showcase" },
];

const TIERS = [
  {
    name: "Full Page",
    size: '4.5" × 7.5"',
    price: "$500+",
    benefits: [
      "Premium playbill placement",
      "Dedicated social media feature",
      "2 complimentary tickets to our shows",
      "Listed in every performance's acknowledgments",
    ],
  },
  {
    name: "Half Page",
    size: '4.5" × 3.625"',
    price: "$250",
    benefits: [
      "Full-season playbill placement",
      "Social media shout-out",
      "Listed in every performance's acknowledgments",
    ],
  },
  {
    name: "Quarter Page",
    size: '2.125" × 3.625"',
    price: "$150",
    benefits: [
      "Full-season playbill placement",
      "Social media shout-out",
      "Listed in every performance's acknowledgments",
    ],
  },
];

export default function SponsorPage() {
  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="wrap">
          <div className="bulbs">
            {Array.from({ length: 9 }).map((_, i) => (
              <span className="bulb" key={i} />
            ))}
            <span className="lbl">Full Season Community Sponsorship · 26-27</span>
          </div>
          <h1>
            Sponsor the
            <span className="em">Season</span>
          </h1>
          <p className="lead">
            One ad, every show. Put your business in the keepsake playbill
            that our students hand to thousands of Waxhaw, Marvin, and
            Weddington families — October through May.
          </p>
          <div className="cta">
            <a className="btn btn-gold cta-glow" href="#tiers">
              See ad options
            </a>
            <CopyEmail className="btn btn-ghost">Email us</CopyEmail>
          </div>
          <div className="pb-meta" style={{ marginTop: 44 }}>
            <div className="mi">
              <div className="lab">Seats per show</div>
              <div className="val">400+</div>
            </div>
            <div className="mi">
              <div className="lab">Performances</div>
              <div className="val">9 events · Oct–May</div>
            </div>
            <div className="mi">
              <div className="lab">Time with your ad</div>
              <div className="val">15–20 min per guest</div>
            </div>
            <div className="mi">
              <div className="lab">Priority deadline</div>
              <div className="val">November 1, 2026</div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section>
        <div className="wrap">
          <div className="sec-head">
            <div>
              <div className="k">Why Sponsor</div>
              <h2>
                Stay <span className="gold">top-of-mind</span> all year
              </h2>
            </div>
          </div>
          <div className="mission">
            <div className="mcard">
              <div className="ic">🎟️</div>
              <h3>Packed local audiences</h3>
              <p>
                Cuthbertson&rsquo;s auditorium seats over 400, and our concert
                and show runs fill it with local families from Waxhaw, Marvin,
                and Weddington.
              </p>
            </div>
            <div className="mcard">
              <div className="ic">📖</div>
              <h3>A keepsake, handed over</h3>
              <p>
                Our high-quality playbill is personally handed to each guest by
                the students you support — and read for 15 to 20 minutes before
                curtain and at intermission.
              </p>
            </div>
            <div className="mcard">
              <div className="ic">🧾</div>
              <h3>Fully tax-deductible</h3>
              <p>
                CHS CHAOS is a registered 501(c)(3). You&rsquo;ll get an
                official donation receipt — market to local families and write
                off the investment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEASON */}
      <section>
        <div className="wrap">
          <div className="sec-head">
            <div>
              <div className="k">October through May</div>
              <h2>
                Your business, <span className="gold">every show</span>
              </h2>
            </div>
          </div>
          <p style={{ color: "var(--ivory-dim)", maxWidth: 720, margin: "-12px 0 24px" }}>
            This year we&rsquo;re selling ad space for the entire calendar
            upfront — the earlier you sign on, the more performances you&rsquo;re
            featured in.
          </p>
          <div className="cast">
            {SEASON.map((s) => (
              <div className="castrow" key={s.what}>
                <span className="role">{s.when}</span>
                <span className="actor">
                  {s.playbill && <span className="lead">Playbill ad</span>}
                  {s.what}
                  {s.note && (
                    <span style={{ display: "block", fontWeight: 400, fontSize: 13, color: "var(--ivory-dim)" }}>
                      {s.note}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <p className="cast-foot">
            Ads print in the playbills for The Great Gatsby and The Hunchback
            of Notre Dame; every other performance lists our sponsors in its
            acknowledgments.
          </p>
        </div>
      </section>

      {/* TIERS */}
      <section id="tiers">
        <div className="wrap">
          <div className="sec-head" style={{ marginBottom: 0 }}>
            <div>
              <div className="k">Three premium tiers · Full season</div>
              <h2>
                Choose your <span className="gold">ad</span>
              </h2>
            </div>
          </div>
          <div className="tiers">
            {TIERS.map((t) => (
              <div className="tier" key={t.name}>
                <div className="tier-name">
                  {t.name} · {t.size}
                </div>
                <div className="tier-price">{t.price}</div>
                <ul className="tier-benefits">
                  {t.benefits.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <CopyEmail className="btn btn-gold cta-glow">
                  Reserve a {t.name} ad
                </CopyEmail>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IMPACT + CONTACT */}
      <section>
        <div className="wrap">
          <div className="split">
            <div>
              <div className="sec-head" style={{ marginBottom: 18 }}>
                <div>
                  <div className="k">Your Impact</div>
                  <h2 style={{ fontSize: 40 }}>
                    Invest in <span className="gold">local youth</span>
                  </h2>
                </div>
              </div>
              <p style={{ color: "var(--ivory-dim)" }}>
                Your sponsorship funds what our Theatre and Choral students need
                to grow into assets of our community.
              </p>
              <ul style={{ color: "var(--ivory-dim)", paddingLeft: 20 }}>
                <li>Food and drinks for long rehearsal days and nights</li>
                <li>Production materials like performance rights and scripts</li>
                <li>Transformative arts experiences for our students</li>
              </ul>
            </div>
            <div className="panel lined panel-pad">
              <h3>Become a sponsor</h3>
              <p>
                Reach out and we&rsquo;ll get your ad into the layout. Priority
                deadline for the playbill is <b>November 1, 2026</b>.
              </p>
              <ul className="bullets">
                <li>
                  <CopyEmail>{EMAIL}</CopyEmail>
                </li>
                <li>
                  <a href={`tel:+1${PHONE.replaceAll("-", "")}`}>{PHONE}</a>
                </li>
                <li>Sonia Larsen, VP Theatre</li>
              </ul>
              <div className="pb-cta">
                <CopyEmail className="btn btn-primary cta-glow">
                  Email to Sponsor
                </CopyEmail>
                <Link className="btn btn-ghost" href="/#season" style={{ color: "var(--ink)", borderColor: "var(--paper-line)" }}>
                  See the season
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
