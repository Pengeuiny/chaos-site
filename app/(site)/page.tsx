import Link from "next/link";
import { getProductions, getPeople } from "@/lib/queries";
import { TICKETS, DUES, PASSES } from "@/lib/links";
import ShowCard from "@/app/components/ShowCard";
import PersonCard from "@/app/components/PersonCard";
import SmartImg from "@/app/components/SmartImg";
import Calendar, { type CalEvent } from "@/app/components/Calendar";

// Render at request time so freshly-published Supabase content always shows.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [productions, people] = await Promise.all([
    getProductions(),
    getPeople(),
  ]);
  const board = people.filter((p) => p.group_name === "board");
  const its = people.filter((p) => p.group_name === "its");

  const events: CalEvent[] = productions
    .flatMap((p) =>
      p.showtimes.map((st) => ({
        slug: p.slug,
        title: p.title,
        starts_at: st.starts_at,
        label: st.label,
      })),
    )
    .sort((a, b) => (a.starts_at < b.starts_at ? -1 : 1));

  return (
    <>
      {/* HERO */}
      <section className="hero" id="home">
        <div className="wrap">
          <div className="eyebrow">Cuthbertson High School · Waxhaw, NC</div>
          <h1>
            Where the
            <br />
            students take
            <span className="em">center stage.</span>
          </h1>
          <p className="lead">
            CHS CHAOS is the parent-led booster organization powering
            Cuthbertson High School&rsquo;s theatre and choral programs —
            tickets, talent, and the people who make the curtain rise.
          </p>
          <div className="cta">
            <a
              className="btn btn-primary"
              href={TICKETS}
              target="_blank"
              rel="noopener"
            >
              🎟 Buy Tickets
            </a>
            <a
              className="btn btn-gold"
              href={PASSES}
              target="_blank"
              rel="noopener"
            >
              Become a Member
            </a>
            <Link className="btn btn-ghost" href="/#season">
              See the Season
            </Link>
          </div>
          <div className="bulbs">
            {Array.from({ length: 9 }).map((_, i) => (
              <span className="bulb" key={i} />
            ))}
            <span className="lbl">Now playing the 2025–26 season</span>
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section id="mission">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <div className="k">Our Mission</div>
              <h2>
                Support that makes the <span className="gold">arts thrive</span>
              </h2>
            </div>
          </div>
          <div className="mission">
            <div className="mcard">
              <div className="ic">🎓</div>
              <h3>Programs</h3>
              <p>
                We&rsquo;re a parent-led organization supporting the Chorus and
                Theatre programs with the resources they need for a thriving
                arts education.
              </p>
            </div>
            <div className="mcard">
              <div className="ic">🤝</div>
              <h3>Volunteer</h3>
              <p>
                We rely on our community to make a difference — a variety of
                ways to get involved, including partnerships with local
                businesses.
              </p>
              <Link className="more" href="/#volunteer">
                Get involved →
              </Link>
            </div>
            <div className="mcard">
              <div className="ic">🎭</div>
              <h3>Events</h3>
              <p>
                From musical performances to drama productions, there is always
                something exciting happening throughout the year.
              </p>
              <Link className="more" href="/#season">
                View the season →
              </Link>
            </div>
            <div className="mcard">
              <div className="ic">💰</div>
              <h3>Sponsors</h3>
              <p>
                Corporate and small-business supporters help us provide a level
                of support like no other for our students.
              </p>
              <Link className="more" href="/#sponsors">
                Sponsor us →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SEASON */}
      <section id="season">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <div className="k">2025–26 Season</div>
              <h2>
                On the <span className="gold">Marquee</span>
              </h2>
            </div>
            <a
              className="btn btn-ghost"
              href={TICKETS}
              target="_blank"
              rel="noopener"
            >
              All tickets ↗
            </a>
          </div>
          <div className="season">
            {productions.map((p) => (
              <ShowCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      </section>

      {/* CALENDAR */}
      <section id="calendar">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <div className="k">Plan Ahead</div>
              <h2>
                Event <span className="gold">Calendar</span>
              </h2>
            </div>
          </div>
          <Calendar events={events} />
        </div>
      </section>

      {/* TICKETS / DUES */}
      <section id="tickets">
        <div className="wrap">
          <div className="split">
            <div className="panel lined panel-pad">
              <h3>Tickets &amp; Dues</h3>
              <p>
                Reserved seating for every mainstage show, plus program dues and
                donations — all handled securely through our box office.
              </p>
              <ul className="bullets">
                <li>Members get early access and discounted tickets</li>
                <li>Pay program dues online in a few clicks</li>
                <li>Support a 501(c)(3) — every dollar funds the kids</li>
              </ul>
              <div className="pb-cta">
                <a
                  className="btn btn-primary"
                  href={TICKETS}
                  target="_blank"
                  rel="noopener"
                >
                  Buy Tickets
                </a>
                <a
                  className="btn btn-gold"
                  href={DUES}
                  target="_blank"
                  rel="noopener"
                >
                  Pay Dues
                </a>
              </div>
            </div>
            <div>
              <div className="sec-head" style={{ marginBottom: 18 }}>
                <div>
                  <div className="k">Membership</div>
                  <h2 style={{ fontSize: 34 }}>
                    Join the <span className="gold">Boosters</span>
                  </h2>
                </div>
              </div>
              <p style={{ color: "var(--ivory-dim)" }}>
                General Booster Membership brings benefits such as early ticket
                purchases and discounted tickets. Becoming a member is the
                simplest way to support the program all year long.
              </p>
              <a
                className="btn btn-gold"
                href={PASSES}
                target="_blank"
                rel="noopener"
                style={{ marginTop: 8 }}
              >
                Become a Member ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* THEATRE & ITS */}
      <section id="theatre">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <div className="k">
                Theatre &amp; International Thespian Society
              </div>
              <h2>
                The home of <span className="gold">creativity</span>
              </h2>
            </div>
          </div>
          <div className="teacher">
            <SmartImg
              src="https://static.wixstatic.com/media/5b4780_1876f3d536a8465593d1f518bf336d97~mv2.jpeg/v1/fill/w_400,h_540,al_c,q_85,enc_avif,quality_auto/Kauffman.jpeg"
              alt="Theatre Director"
            />
            <div className="t-body">
              <h3>Welcome to CHS Theatre</h3>
              <p>
                Welcome to the Cuthbertson High School Theatre Department — the
                home of creativity and artistic expression. Our productions are
                the result of hard work, dedication, and collaboration between
                teachers and students. Everyone is welcome to join our theatre
                family.
              </p>
            </div>
          </div>
          <div className="sec-head" style={{ marginBottom: 22 }}>
            <div>
              <div className="k">Learners · Leaders · Scholars</div>
              <h2 style={{ fontSize: 34 }}>
                ITS <span className="gold">Student Board</span>
              </h2>
            </div>
          </div>
          <div className="people">
            {its.map((p) => (
              <PersonCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      </section>

      {/* CHORUS */}
      <section id="chorus">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <div className="k">Chorus</div>
              <h2>
                Statewide-recognized <span className="gold">voices</span>
              </h2>
            </div>
          </div>
          <div className="teacher">
            <SmartImg
              src="https://static.wixstatic.com/media/5b4780_85d0b7e681444b3e893fa99a654a5e68~mv2.jpg/v1/fill/w_400,h_540,al_c,q_85,enc_avif,quality_auto/Waynick_edited_edited.jpg"
              alt="Chorus Director"
            />
            <div className="t-body">
              <h3>Welcome to CHS Chorus</h3>
              <p>
                Our chorus students are hard-working, passionate, and committed
                to the art of music performance. By working closely with each
                student we bring out the best in every voice — and our program
                has earned statewide recognition year after year, with two
                ensembles: Concert Chorus and Ladies Chorus.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BOARD */}
      <section id="board">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <div className="k">Dedication · Expertise · Passion</div>
              <h2>
                The <span className="gold">CHAOS Board</span>
              </h2>
            </div>
            <Link className="btn btn-ghost" href="/#volunteer">
              Join us →
            </Link>
          </div>
          <p
            style={{
              color: "var(--ivory-dim)",
              maxWidth: 720,
              margin: "-12px 0 30px",
            }}
          >
            We&rsquo;re a group of dedicated parents who volunteer our time — and
            often our blood, sweat, and tears — to support our kids and teachers
            in putting on the best possible performance for our community.
          </p>
          <div className="people">
            {board.map((p) => (
              <PersonCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      </section>

      {/* VOLUNTEER */}
      <section id="volunteer">
        <div className="wrap">
          <div className="split">
            <div>
              <div className="sec-head" style={{ marginBottom: 18 }}>
                <div>
                  <div className="k">Get Involved</div>
                  <h2 style={{ fontSize: 40 }}>
                    Volunteer with <span className="gold">CHAOS</span>
                  </h2>
                </div>
              </div>
              <p style={{ color: "var(--ivory-dim)" }}>
                A strong arts education enriches the lives of young people and
                strengthens our community. With the backing of passionate
                parents, community members, and volunteers, these programs
                thrive. Donate your time — or just a few hours — and make a
                lasting impact.
              </p>
              <div className="pb-cta" style={{ marginTop: 14 }}>
                <Link className="btn btn-primary" href="/#contact">
                  Contact the Board
                </Link>
                <a
                  className="btn btn-gold"
                  href={PASSES}
                  target="_blank"
                  rel="noopener"
                >
                  Become a Member
                </a>
              </div>
            </div>
            <div className="panel lined panel-pad">
              <h3>Ways to help</h3>
              <ul className="bullets">
                <li>Backstage, set, and costume crews</li>
                <li>Concessions and front-of-house</li>
                <li>Fundraising and corporate partnerships</li>
                <li>Open board positions — lead a committee</li>
              </ul>
              <p
                style={{
                  margin: 0,
                  fontFamily: "'Space Mono'",
                  fontSize: 13,
                  color: "var(--crimson-deep)",
                }}
              >
                Open board positions available now.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SPONSORS */}
      <section id="sponsors">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <div className="k">Corporate &amp; Small-Business Supporters</div>
              <h2>
                Our <span className="gold">Sponsors</span>
              </h2>
            </div>
          </div>
          <div className="sponsor">
            <div className="logo">
              <SmartImg
                src="https://static.wixstatic.com/media/020dca_adc56bcbf0974b76a862035ba4f39def~mv2.png/v1/fill/w_120,h_119,al_c,q_85,enc_avif,quality_auto/020dca_adc56bcbf0974b76a862035ba4f39def~mv2.png"
                alt="OoShirts"
                fallback={<b style={{ color: "#b11e37" }}>Oo</b>}
              />
            </div>
            <div>
              <h3>OoShirts</h3>
              <p style={{ color: "var(--ivory-dim)", margin: "6px 0" }}>
                Proud supporter of CHS CHAOS. OoShirts are great!
              </p>
              <a
                className="btn btn-ghost"
                href="https://www.ooshirts.com/"
                target="_blank"
                rel="noopener"
              >
                www.ooshirts.com ↗
              </a>
            </div>
          </div>
          <p style={{ color: "var(--ivory-dim)", marginTop: 22 }}>
            Interested in partnering with us? We&rsquo;d love to feature your
            business here.{" "}
            <Link style={{ color: "var(--brass-soft)" }} href="/#contact">
              Get in touch →
            </Link>
          </p>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <div className="k">Say Hello</div>
              <h2>
                Contact <span className="gold">CHS CHAOS</span>
              </h2>
            </div>
          </div>
          <div className="contact">
            <div className="card">
              <h3>Reach the Board</h3>
              <a className="line" href="mailto:info@chschaos.org">
                ✉ info@chschaos.org
              </a>
              <a className="line" href="mailto:president@chschaos.org">
                President · president@chschaos.org
              </a>
              <a className="line" href="mailto:treasurer@chschaos.org">
                Treasurer · treasurer@chschaos.org
              </a>
              <a className="line" href="mailto:vptheatre@chschaos.org">
                VP Theatre · vptheatre@chschaos.org
              </a>
              <a className="line" href="mailto:vpchorus@chschaos.org">
                VP Chorus · vpchorus@chschaos.org
              </a>
              <div className="socials">
                <a
                  href="https://www.facebook.com/CHSCHAOS"
                  target="_blank"
                  rel="noopener"
                  aria-label="Facebook"
                >
                  f
                </a>
                <a
                  href="https://www.instagram.com/chs_chaos/"
                  target="_blank"
                  rel="noopener"
                  aria-label="Instagram"
                >
                  ⌾
                </a>
                <a
                  href="https://www.x.com/chs_chaos"
                  target="_blank"
                  rel="noopener"
                  aria-label="X"
                >
                  ✕
                </a>
              </div>
            </div>
            <div className="card">
              <h3>Find Us</h3>
              <p style={{ color: "var(--ivory-dim)", margin: "0 0 6px" }}>
                CHS CHAOS
                <br />
                3919 Providence Rd S
                <br />
                Ste. B PMB&nbsp;#215
                <br />
                Waxhaw, NC 28173
              </p>
              <p
                style={{
                  fontFamily: "'Space Mono'",
                  fontSize: 12.5,
                  color: "var(--brass-soft)",
                  marginTop: 14,
                }}
              >
                A parent-based 501(c)(3) non-profit serving Cuthbertson High
                School theatre &amp; chorus.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
