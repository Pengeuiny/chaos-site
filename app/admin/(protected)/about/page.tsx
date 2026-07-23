import type { Metadata } from "next";
import AdminTabs from "@/app/admin/AdminTabs";
import pkg from "@/package.json";
import styles from "../../admin.module.css";

export const metadata: Metadata = { title: "About This Site · CHS CHAOS Admin" };

/**
 * A living description of how this site is built, hosted, and paid for —
 * written for both a non-technical board member and a future developer.
 *
 * MAINTENANCE: whoever makes a structural change (new hosting/database
 * provider, a framework upgrade that changes behavior, a new paid service,
 * a new integration) should update this page in the same change. Dependency
 * *versions* below are pulled live from package.json, so those never go
 * stale on their own — everything else here is prose that a human (or
 * Claude, working from this repo's AGENTS.md/CLAUDE.md instructions) has to
 * edit by hand when it changes.
 */
export default function AboutSitePage() {
  return (
    <>
      <h1 className={styles.h1}>Dashboard</h1>
      <AdminTabs active="about" />

      <div className={styles.card} style={{ maxWidth: 820 }}>
        <h2 className={styles.h2}>What this is</h2>
        <p>
          This is the CHS CHAOS website: a public site (season lineup,
          calendar, tickets, the Board) plus this private admin area, where
          you&rsquo;re reading this right now, for managing shows, events,
          board members, and photos without touching any code.
        </p>
        <p>
          When you edit something here — a show&rsquo;s dates, a new board
          member, a photo — it saves straight to the live database. Public
          pages catch up within about a minute. Buying a ticket, paying
          dues, or getting a Flex Pass always happens on the existing CHAOS
          box office (Ludus) — this site never touches payments directly.
        </p>
      </div>

      <div className={styles.card} style={{ maxWidth: 820, marginTop: 20 }}>
        <h2 className={styles.h2}>What it costs</h2>
        <p className={styles.muted} style={{ marginBottom: 12 }}>
          Every piece of infrastructure below runs on a free plan — and not a
          free trial that expires. These are plans providers offer free
          permanently, by design, for a site at this scale. Nothing here is
          on a clock.
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#9c8f7e" }}>
              <th style={{ padding: "6px 8px 6px 0", fontWeight: 600 }}>Component</th>
              <th style={{ padding: "6px 8px", fontWeight: 600 }}>Provider</th>
              <th style={{ padding: "6px 8px", fontWeight: 600 }}>Plan</th>
              <th style={{ padding: "6px 0", fontWeight: 600 }}>Cost</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Hosting + builds", "Vercel", "Hobby (free forever)"],
              ["Database + file storage", "Supabase", "Free (free forever)"],
              ["Source code", "GitHub", "Public repo"],
              ["Domain", "vercel.app subdomain", "see note below"],
              ["Ticketing & payments", "Ludus (existing box office)", "external — not billed here"],
              ["Social posting", "Meta Graph API", "free API"],
            ].map(([what, provider, plan]) => (
              <tr key={what} style={{ borderTop: "1px solid rgba(233,185,73,.15)" }}>
                <td style={{ padding: "8px 8px 8px 0" }}>{what}</td>
                <td style={{ padding: "8px" }}>{provider}</td>
                <td style={{ padding: "8px", color: "#e3d9c6" }}>{plan}</td>
                <td style={{ padding: "8px 0", fontWeight: 700, color: "#f0c66b" }}>$0</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: 14, fontWeight: 700 }}>Total: $0/month</p>
        <p className={styles.muted} style={{ marginTop: 14 }}>
          <strong style={{ color: "#e3d9c6" }}>On the domain:</strong> the
          site currently runs on a free vercel.app address. If CHAOS already
          owns (or later buys) a custom domain — e.g. chschaos.org —
          it can be pointed at this site for free; Vercel doesn&rsquo;t
          charge anything to connect a domain you own, only domain
          registration itself costs money (paid to whoever the domain is
          registered through, not Vercel). Connecting a domain like that
          doesn&rsquo;t require changing the domain name itself — it just
          tells that existing name where to point.
        </p>
      </div>

      <div className={styles.card} style={{ maxWidth: 820, marginTop: 20 }}>
        <h2 className={styles.h2}>Under the hood</h2>

        <h3 style={{ color: "#e3d9c6", fontSize: 15, margin: "0 0 6px" }}>
          Framework &amp; code
        </h3>
        <p className={styles.muted} style={{ marginBottom: 16 }}>
          Built with{" "}
          <a href="https://nextjs.org" target="_blank" rel="noopener">
            Next.js {pkg.dependencies.next}
          </a>{" "}
          (App Router) and React {pkg.dependencies.react}, written in
          TypeScript. Pages that don&rsquo;t need a database render as plain
          static HTML; everything else (admin pages, individual show pages)
          renders on the server per request. Plain CSS — no UI framework.
        </p>

        <h3 style={{ color: "#e3d9c6", fontSize: 15, margin: "0 0 6px" }}>
          Hosting &amp; deploys
        </h3>
        <p className={styles.muted} style={{ marginBottom: 16 }}>
          Hosted on <a href="https://vercel.com" target="_blank" rel="noopener">Vercel</a>.
          Every push to the <code>main</code> branch on GitHub triggers an
          automatic build and deploy — no manual deploy step. Cold code
          changes (not content edits) are typically live within 1–2 minutes
          of being pushed.
        </p>

        <h3 style={{ color: "#e3d9c6", fontSize: 15, margin: "0 0 6px" }}>
          Database &amp; file storage
        </h3>
        <p className={styles.muted} style={{ marginBottom: 16 }}>
          <a href="https://supabase.com" target="_blank" rel="noopener">Supabase</a>{" "}
          (hosted Postgres) holds shows, events, cast lists, and board/ITS
          member records. Uploaded photos live in two public Supabase
          Storage buckets (<code>posters</code>, <code>people</code>) —
          images are resized/cropped server-side with{" "}
          <code>sharp {pkg.dependencies.sharp}</code> before upload, so the
          site never hot-links a full-size original from someone&rsquo;s
          phone.
        </p>

        <h3 style={{ color: "#e3d9c6", fontSize: 15, margin: "0 0 6px" }}>
          Admin login
        </h3>
        <p className={styles.muted} style={{ marginBottom: 16 }}>
          A single shared admin password (not individual accounts), checked
          server-side, backed by a signed session cookie. No third-party
          auth service.
        </p>

        <h3 style={{ color: "#e3d9c6", fontSize: 15, margin: "0 0 6px" }}>
          Source code
        </h3>
        <p className={styles.muted} style={{ marginBottom: 16 }}>
          Stored in a public GitHub repository. The repo root has two
          instruction files, <code>AGENTS.md</code> and{" "}
          <code>CLAUDE.md</code> — these aren&rsquo;t pages anyone visits;
          they&rsquo;re standing notes for an AI coding assistant (Claude)
          so that AI-assisted changes stay consistent with how this specific
          codebase already works, instead of re-guessing conventions every
          session.
        </p>

        <h3 style={{ color: "#e3d9c6", fontSize: 15, margin: "0 0 6px" }}>
          Dependencies (live from package.json)
        </h3>
        <ul className={styles.muted} style={{ margin: 0, paddingLeft: 18 }}>
          {Object.entries(pkg.dependencies).map(([name, version]) => (
            <li key={name}>
              <code>{name}</code> {version}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
