import Link from "next/link";
import styles from "./nemo.module.css";
import Bubbles from "./Bubbles";
import Reveal from "./Reveal";
import Ocean from "./Ocean";

export const metadata = {
  title: "Finding Nemo Jr. — Summer Musical Intensive · CHS CHAOS",
  description:
    "A two-week summer musical intensive at Cuthbertson High School. Build a full production of Finding Nemo Jr. — July 13–17 & 20–24, 2026.",
};

export default function NemoPage() {
  return (
    <div className={styles.root}>
      <Ocean className={styles.ocean} />
      <div className={styles.oceanFallback} />
      <div className={styles.depthtint} />
      <Bubbles className={styles.bubbles} bubbleClass={styles.bubble} />
      <Reveal revealClass={styles.reveal} inClass={styles.in} />

      <div className={styles.topbar}>
        <Link className={styles.home} href="/">
          ← Back to CHS CHAOS
        </Link>
        <span className={styles.org}>CHAOS · Summer 2026</span>
      </div>

      <header className={styles.hero}>
        <div className={styles.kicker}>
          Cuthbertson High School · Two-Week Musical Intensive
        </div>
        <h1>
          Finding Nemo<span className={styles.jr}>Jr.</span>
        </h1>
        <div className={styles.sub}>Dive in. Build a whole show. Take a bow.</div>
        <div className={styles.dates}>JULY 13–17 &nbsp;+&nbsp; JULY 20–24, 2026</div>
        <div className={styles.cta}>
          <a
            className={`${styles.btn} ${styles.btnCoral}`}
            href="https://cuthbertsontheatre.ludus.com/index.php?sections=payments"
            target="_blank"
            rel="noopener"
          >
            🐟 Register Now
          </a>
          <a className={`${styles.btn} ${styles.btnAqua}`} href="#how">
            How it works
          </a>
        </div>
        <div className={styles.scrollcue}>Scroll to descend ↓</div>
      </header>

      <section className={styles.block}>
        <div className={`${styles.wrap} ${styles.reveal}`}>
          <div className={styles.eyebrow}>The Intensive</div>
          <h2 className={styles.big}>
            Two weeks.
            <br />
            One full production.
          </h2>
          <p className={styles.lede}>
            Our summer flagship is a from-scratch build of a complete{" "}
            <em>Finding Nemo Jr.</em> production — music, choreography, staging,
            and tech — performed live for family and friends. Campers don&rsquo;t
            just rehearse a number; they make a whole show and the memories that
            come with it.
          </p>
          <div className={styles.feat}>
            <div className={`${styles.glass} ${styles.reveal}`}>
              <div className={styles.ic}>🎶</div>
              <h3>Sing it</h3>
              <p>
                Learn the score with our chorus directors — harmonies, solos, and
                the big ensemble numbers.
              </p>
            </div>
            <div className={`${styles.glass} ${styles.reveal}`}>
              <div className={styles.ic}>🌊</div>
              <h3>Stage it</h3>
              <p>
                Blocking, choreography, and character work that turn the ocean
                into a living set.
              </p>
            </div>
            <div className={`${styles.glass} ${styles.reveal}`}>
              <div className={styles.ic}>🎭</div>
              <h3>Show it</h3>
              <p>
                Tech, costumes, and a full final performance under real stage
                lights.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.block} id="how">
        <div className={`${styles.wrap} ${styles.reveal}`}>
          <div className={styles.eyebrow}>How it works</div>
          <h2 className={styles.big}>
            From the shallows
            <br />
            to opening night.
          </h2>
          <div className={styles.weeks}>
            <div className={`${styles.week} ${styles.w1} ${styles.reveal}`}>
              <div className={styles.wnum}>WEEK ONE</div>
              <h3>Build the world</h3>
              <div className={styles.wd}>July 13 – 17, 2026</div>
              <ul>
                <li>Auditions &amp; casting</li>
                <li>Learn the music and lyrics</li>
                <li>Start blocking and choreography</li>
                <li>Meet your crew and your characters</li>
              </ul>
            </div>
            <div className={`${styles.week} ${styles.w2} ${styles.reveal}`}>
              <div className={styles.wnum}>WEEK TWO</div>
              <h3>Take the stage</h3>
              <div className={styles.wd}>July 20 – 24, 2026</div>
              <ul>
                <li>Off-book run-throughs</li>
                <li>Costumes, props, and set</li>
                <li>Tech and dress rehearsals</li>
                <li>Live final performance</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.block}>
        <div className={`${styles.wrap} ${styles.reveal}`}>
          <div className={styles.eyebrow}>The Details</div>
          <h2 className={styles.big}>Everything you need.</h2>
          <div className={styles.details}>
            <div className={`${styles.detcard} ${styles.reveal}`}>
              <div className={styles.l}>When</div>
              <div className={styles.v}>
                Jul 13–17
                <br />
                &amp; 20–24, 2026
              </div>
            </div>
            <div className={`${styles.detcard} ${styles.reveal}`}>
              <div className={styles.l}>Where</div>
              <div className={styles.v}>
                Cuthbertson
                <br />
                High School
              </div>
            </div>
            <div className={`${styles.detcard} ${styles.reveal}`}>
              <div className={styles.l}>Format</div>
              <div className={styles.v}>
                Two-week
                <br />
                intensive
              </div>
            </div>
            <div className={`${styles.detcard} ${styles.reveal}`}>
              <div className={styles.l}>Register</div>
              <div className={styles.v}>
                Online via
                <br />
                the box office
              </div>
            </div>
          </div>
          <p
            className={styles.lede}
            style={{
              marginTop: "30px",
              fontFamily: "'Space Mono'",
              fontSize: "14px",
              color: "var(--aqua-soft)",
            }}
          >
            ★ Ages, pricing, and daily schedule are set per session — confirm
            current details at registration.
          </p>
        </div>
      </section>

      <section className={`${styles.final} ${styles.reveal}`}>
        <div className={styles.wrap}>
          <h2>Ready to dive in?</h2>
          <p>
            Spots fill fast. Register through the Cuthbertson Theatre box office
            and we&rsquo;ll see you in the water.
          </p>
          <a
            className={`${styles.btn} ${styles.btnCoral}`}
            href="https://cuthbertsontheatre.ludus.com/index.php?sections=payments"
            target="_blank"
            rel="noopener"
            style={{ fontSize: "17px", padding: "16px 30px" }}
          >
            🐟 Register
          </a>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.fb}>CHS CHAOS</div>
        <small>
          Cuthbertson High School Theatre &amp; Chorus Boosters · Waxhaw, NC ·
          info@chschaos.org
        </small>
      </footer>
    </div>
  );
}
