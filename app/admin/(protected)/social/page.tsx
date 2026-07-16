import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { socialConfigured } from "@/lib/social";
import SocialComposer from "@/app/admin/SocialComposer";
import AdminTabs from "@/app/admin/AdminTabs";
import styles from "../../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Social media · CHS CHAOS" };

type Show = {
  id: string;
  title: string;
  tagline: string | null;
  date_range: string | null;
  ticket_url: string | null;
  poster_url: string | null;
};

export default async function SocialPage() {
  const admin = createAdminClient();
  const platforms = socialConfigured();

  let shows: Show[] = [];
  if (admin) {
    // eslint-disable-next-line react-hooks/purity -- temporary perf diagnostic
    const t0 = Date.now();
    const { data } = await admin
      .from("productions")
      .select("id, title, tagline, date_range, ticket_url, poster_url")
      .order("sort_order", { ascending: true });
    // eslint-disable-next-line react-hooks/purity -- temporary perf diagnostic
    console.log(`[perf] /admin/social productions query: ${Date.now() - t0}ms`);
    shows = (data as Show[] | null) ?? [];
  }

  const missing = !platforms.facebook || !platforms.instagram;

  return (
    <>
      <h1 className={styles.h1}>Dashboard</h1>
      <AdminTabs active="social" />

      {!admin && (
        <div className={styles.error}>
          Not connected to Supabase (SUPABASE_SERVICE_ROLE_KEY).
        </div>
      )}

      {missing && (
        <details className={styles.helpBox} style={{ marginBottom: 20 }} open>
          <summary>
            {!platforms.facebook && !platforms.instagram
              ? "Facebook & Instagram aren't connected yet"
              : !platforms.facebook
                ? "Facebook isn't connected yet"
                : "Instagram isn't connected yet"}
          </summary>
          <ol>
            <li>
              Go to <code>developers.facebook.com/apps</code> and create an
              app (type: &ldquo;Business&rdquo;).
            </li>
            <li>
              Add the <strong>Facebook Login for Business</strong> and{" "}
              <strong>Instagram Graph API</strong> products to the app.
            </li>
            <li>
              Make sure the CHS CHAOS Instagram account is a Business/Creator
              account and is linked to the CHS CHAOS Facebook Page (Meta
              Business Suite → Settings → Accounts).
            </li>
            <li>
              In the Graph API Explorer, pick the app and the Page, and
              generate a User Access Token with the{" "}
              <code>pages_manage_posts</code>, <code>pages_read_engagement</code>
              , <code>instagram_basic</code>, and{" "}
              <code>instagram_content_publish</code> permissions.
            </li>
            <li>
              Use the Access Token Debugger (or the{" "}
              <code>oauth/access_token</code> endpoint) to exchange it for a{" "}
              <strong>long-lived Page Access Token</strong> — this is the one
              that doesn&rsquo;t expire hourly.
            </li>
            <li>
              Find the Page ID (Page → About) and the Instagram Business
              Account ID by calling{" "}
              <code>GET /&#123;page-id&#125;?fields=instagram_business_account</code>{" "}
              in the Graph API Explorer.
            </li>
            <li>
              [Send to Web Admin] Set <code>META_PAGE_ACCESS_TOKEN</code>,{" "}
              <code>META_PAGE_ID</code>, and <code>META_IG_USER_ID</code> in
              the project&rsquo;s environment variables (Vercel dashboard, or{" "}
              <code>.env.local</code> for local dev), then redeploy.
            </li>
          </ol>
        </details>
      )}

      <section className={styles.card} style={{ maxWidth: 640 }}>
        <h2 className={styles.h2}>Publish an event</h2>
        {shows.length === 0 ? (
          <p className={styles.muted}>Create a show first.</p>
        ) : (
          <SocialComposer shows={shows} platforms={platforms} />
        )}
      </section>
    </>
  );
}
