import styles from "./page.module.css";
import { getProductions } from "@/lib/queries";

export default async function Home() {
  const productions = await getProductions();
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  return (
    <main>
      <section className={styles.hero}>
        <div className="wrap">
          <p className={`eyebrow ${styles.eyebrow}`}>
            Cuthbertson High School · Waxhaw, NC
          </p>
          <h1 className={`display ${styles.title}`}>
            CHS <span>CHAOS</span>
          </h1>
          <p className={styles.lede}>
            The booster club behind Cuthbertson High School&rsquo;s theatre and
            choral programs — tickets, season events, and ways to volunteer.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className="wrap">
          <div className={styles.sectionHead}>
            <h2 className={`serif ${styles.sectionTitle}`}>The Season</h2>
          </div>

          {!configured && (
            <div className={styles.notice}>
              <strong>Supabase isn&rsquo;t connected yet.</strong> Copy{" "}
              <code>.env.local.example</code> to <code>.env.local</code>, add
              your project URL and anon key, run <code>supabase/schema.sql</code>{" "}
              in the SQL Editor, and this section will populate from the{" "}
              <code>productions</code> table.
            </div>
          )}

          {configured && productions.length === 0 && (
            <div className={styles.notice}>
              Connected to Supabase, but no productions found yet. Add rows to
              the <code>productions</code> table to see them here.
            </div>
          )}

          {productions.length > 0 && (
            <div className={styles.grid}>
              {productions.map((p) => (
                <article
                  key={p.id}
                  className={styles.card}
                  style={{ color: p.accent ?? "var(--brass)" }}
                >
                  {p.tag_text && <span className={styles.tag}>{p.tag_text}</span>}
                  <h3 className={`serif ${styles.cardTitle}`}>{p.title}</h3>
                  {p.type && <p className={styles.cardType}>{p.type}</p>}
                  {p.tagline && <p className={styles.cardText}>{p.tagline}</p>}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
