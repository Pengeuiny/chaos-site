import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Pulls every article in Ludus's public manual (support.ludus.com, an
// Archbee site with no bot challenge) over plain HTTP and saves the article
// body as text plus the site's own section hierarchy. No browser needed.
const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "out", "support");
fs.mkdirSync(outDir, { recursive: true });
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

const strip = (h) => h
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/gi, "")
  .replace(/<\/(p|div|li|h[1-6]|tr|br|section|article)>/gi, "\n")
  .replace(/<li[^>]*>/gi, "- ")
  .replace(/<h([1-6])[^>]*>/gi, (_, n) => "\n" + "#".repeat(+n) + " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();

const sitemap = await (await fetch("https://support.ludus.com/sitemap.xml", { headers: { "user-agent": UA } })).text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
console.log(`${urls.length} articles in sitemap`);

const retryOnly = process.argv.includes("--retry");
const workers = retryOnly ? 1 : 6;
const isBlocked = (slug) => { try { return fs.readFileSync(path.join(outDir, `${slug}.md`), "utf8").slice(0, 200).includes("Just a moment"); } catch { return true; } };
if (retryOnly) { const before = urls.length; for (let i = urls.length - 1; i >= 0; i--) { const slug = urls[i].replace("https://support.ludus.com/", "").replace(/^\/?$/, "index").replace(/[^a-zA-Z0-9_-]+/g, "-"); if (!isBlocked(slug)) urls.splice(i, 1); } console.log(`retrying ${urls.length} of ${before} blocked articles, slowly`); }
const index = [];
let tree = null;
let done = 0, failed = 0;
const worker = async () => {
  while (urls.length) {
    const url = urls.shift();
    const slug = url.replace("https://support.ludus.com/", "").replace(/^\/?$/, "index").replace(/[^a-zA-Z0-9_-]+/g, "-");
    try {
      const html = await (await fetch(url, { headers: { "user-agent": UA } })).text();
      if (html.includes("Just a moment")) { urls.push(url); await new Promise((r) => setTimeout(r, 15000)); continue; }
      if (retryOnly) await new Promise((r) => setTimeout(r, 1200));
      const title = (html.match(/<title[^>]*>([^<]*)<\/title>/)?.[1] || "").replace(/ - Ludus Manual$/, "").trim();
      // The article body runs from the document title <h1> to the PREVIOUS/NEXT pager.
      const h1 = html.indexOf('data-cy="public-document-title"');
      const startAt = h1 >= 0 ? html.lastIndexOf("<h1", h1) : 0;
      const pagerAt = (() => { const i = html.indexOf(">PREVIOUS<", startAt); const j = html.indexOf(">NEXT<", startAt); const c = [i, j].filter((x) => x > 0); return c.length ? Math.min(...c) : html.length; })();
      const text = strip(html.slice(startAt, pagerAt)).replace(/^# .*\n+/, "").trim();
      fs.writeFileSync(path.join(outDir, `${slug}.md`), `# ${title}\n\nSource: ${url}\n\n${text}\n`);
      // Section hierarchy from the sidebar: <a href="/x"> inside the nav, with nesting via data/aria if present.
      if (!tree) {
        const nd = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (nd) { try { tree = JSON.parse(nd[1]).props?.pageProps?._docSpace?.publicDocsTree ?? null; } catch {} }
      }
      // Sidebar links in DOM order (gives section grouping: top-level section headings precede their children).
      const navLinks = [...html.matchAll(/<a[^>]+href="(\/[^"#]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((x) => [x[1], strip(x[2]).slice(0, 80)]);
      index.push({ url, slug, title, chars: text.length, navLinks: index.length === 0 ? navLinks : undefined });
      done++;
    } catch (e) { failed++; index.push({ url, slug, error: String(e.message) }); }
    if ((done + failed) % 50 === 0) console.log(`${done + failed} fetched (${failed} failed)`);
  }
};
await Promise.all(Array.from({ length: workers }, worker));
if (!retryOnly) fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify(index, null, 2));
if (tree) fs.writeFileSync(path.join(outDir, "tree.json"), JSON.stringify(tree, null, 2));
console.log(`Saved ${done} articles (${failed} failed) to ${outDir}`);
