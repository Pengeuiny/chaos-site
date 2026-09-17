import fs from "node:fs";
import path from "node:path";
import { openContext, ORIGIN, OUT_DIR, isChallenge, isLoginPage, slugify, dismissCookieBanner, reauthIfNeeded } from "./common.mjs";

// Read-only crawl (headed by default — see common.mjs) of the signed-in Ludus site. Follows same-origin
// GET links breadth-first, saving a full-page screenshot plus the page's
// text, headings, links, and form fields for each page, so the docs can be
// written from real screens. Never submits forms and skips anything that
// looks like it could change state.
//
//   node explore.mjs [startUrl] [maxPages] [pathPrefix]
//   node explore.mjs steps/<list>.txt [maxPages] [runName]
// pathPrefix (e.g. "/admin") restricts the crawl to links under that path.
// A .txt start argument is a list of URLs/paths (one per line, # comments):
// each is captured in order and no further links are followed.

const start = process.argv[2] || `${ORIGIN}/`;
const maxPages = Number(process.argv[3] || 40);
const listMode = start.endsWith(".txt");
const prefix = listMode ? "" : (process.argv[4] || "");
const runName = listMode ? (process.argv[4] || path.basename(start, ".txt")) : (prefix ? `explore${prefix.replace(/\//g, "-")}` : "explore");
const runDir = path.join(OUT_DIR, runName);
fs.mkdirSync(runDir, { recursive: true });

// Anything that could plausibly change state via a GET link is skipped; pages
// that merely *show* a form (new/edit) are kept because the crawl never submits.
const SKIP = /logout|log_out|signout|sign_out|delete|remove|cancel|refund|void|destroy|resend|send|email_|export|download|print|checkout|cart|add_|unsubscribe|waitlist|toggle|hide_|activate|deactivate|enable|disable|archive|restore|publish|duplicate|clone|copy|approve|reject|mark_|update|save|submit|process|charge|payout|transfer|impersonate|login_as|switch|scan|check_?in|\.pdf|\.csv|\.xlsx|javascript:|mailto:|tel:|#/i;

const ctx = await openContext();
const page = ctx.pages()[0] ?? (await ctx.newPage());

const queue = listMode
  ? fs.readFileSync(start, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => (l.startsWith("http") ? l : ORIGIN + l))
  : [start];
const seen = new Set();
const index = [];

while (queue.length && index.length < maxPages) {
  const url = queue.shift();
  const key = url.replace(/[?&]$/, "");
  if (seen.has(key)) continue;
  seen.add(key);

  let resp;
  try {
    resp = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  } catch (e) {
    index.push({ url, error: String(e.message).split("\n")[0] });
    continue;
  }

  if (await isChallenge(page)) {
    console.error(`Cloudflare challenge at ${url} — clearance expired. Run \`npm run login\` again, then re-run.`);
    break;
  }
  if (await isLoginPage(page)) {
    const ok = await reauthIfNeeded(page);
    if (ok) { await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {}); }
    if (!ok || (await isLoginPage(page))) {
      console.error(`Not signed in (landed on login at ${url}). Run \`npm run login\` first.`);
      break;
    }
  }

  await dismissCookieBanner(page);
  const n = String(index.length + 1).padStart(2, "0");
  const slug = slugify(url);
  const base = `${n}-${slug}`;
  await page.screenshot({ path: path.join(runDir, `${base}.png`), fullPage: true });

  const data = await page.evaluate(() => {
    const txt = (el) => (el?.innerText || "").replace(/\s+\n/g, "\n").trim();
    const links = [...document.querySelectorAll("a[href]")].map((a) => ({
      text: txt(a).slice(0, 80), href: a.href,
    })).filter((l) => l.text);
    const headings = [...document.querySelectorAll("h1,h2,h3")].map((h) => `${h.tagName.toLowerCase()}: ${txt(h)}`);
    const forms = [...document.querySelectorAll("form")].map((f) => ({
      action: f.action, method: f.method,
      fields: [...f.querySelectorAll("input,select,textarea,button")].map((i) => ({
        tag: i.tagName.toLowerCase(), type: i.type, name: i.name, label: i.labels?.[0]?.innerText?.trim() || i.placeholder || i.value || "",
      })).filter((i) => i.type !== "hidden"),
    }));
    return { title: document.title, headings, links, forms, text: txt(document.body).slice(0, 20000) };
  });

  fs.writeFileSync(path.join(runDir, `${base}.json`), JSON.stringify({ url, status: resp?.status(), ...data }, null, 2));
  index.push({ n, url, title: data.title, screenshot: `${base}.png`, links: data.links.length });
  console.log(`${n} ${resp?.status()} ${data.title} — ${url}`);

  if (listMode) continue;
  for (const l of data.links) {
    if (!l.href.startsWith(ORIGIN + prefix)) continue;
    if (SKIP.test(l.href)) continue;
    const k = l.href.replace(/[?&]$/, "");
    if (!seen.has(k) && !queue.includes(l.href)) queue.push(l.href);
  }
}

fs.writeFileSync(path.join(runDir, "index.json"), JSON.stringify(index, null, 2));
console.log(`Saved ${index.length} pages to ${runDir}`);
await ctx.close();
