import fs from "node:fs";
import path from "node:path";
import { openContext, OUT_DIR, isChallenge, isLoginPage, dismissCookieBanner } from "./common.mjs";

// Scripted walkthrough (headed by default — see common.mjs). Reads a steps file (JSON array) and runs
// each step against the signed-in profile, capturing a screenshot after
// every step so a how-to can be written with one image per action.
//
//   node walk.mjs steps/<name>.json
//
// Step shapes:
//   { "goto": "https://..." }
//   { "click": "<playwright selector>", "note": "what this does" }
//   { "fill": "<selector>", "value": "text" }
//   { "select": "<selector>", "value": "option" }
//   { "wait": 1500 }
//   { "shot": "custom-name" }   (a screenshot is taken after every step anyway)
// Steps never submit a form unless the step explicitly clicks a submit button.

const stepsFile = process.argv[2];
if (!stepsFile) { console.error("usage: node walk.mjs steps/<name>.json"); process.exit(1); }
const steps = JSON.parse(fs.readFileSync(stepsFile, "utf8"));
const name = path.basename(stepsFile, ".json");
const runDir = path.join(OUT_DIR, "walk", name);
fs.mkdirSync(runDir, { recursive: true });

const ctx = await openContext();
const page = ctx.pages()[0] ?? (await ctx.newPage());
const log = [];

for (let i = 0; i < steps.length; i++) {
  const s = steps[i];
  const n = String(i + 1).padStart(2, "0");
  try {
    if (s.goto) await page.goto(s.goto, { waitUntil: "networkidle", timeout: 45000 });
    if (s.click) { await page.locator(s.click).first().click(); await page.waitForLoadState("networkidle").catch(() => {}); }
    if (s.fill) await page.locator(s.fill).first().fill(String(s.value ?? ""));
    if (s.select) await page.locator(s.select).first().selectOption(String(s.value ?? ""));
    if (s.wait) await page.waitForTimeout(s.wait);

    await dismissCookieBanner(page);
    if (await isChallenge(page)) throw new Error("Cloudflare challenge — run `npm run login` again");
    if (await isLoginPage(page)) throw new Error("Not signed in — run `npm run login` first");

    const file = `${n}-${s.shot || Object.keys(s)[0]}.png`;
    await page.screenshot({ path: path.join(runDir, file), fullPage: true });
    log.push({ n, step: s, url: page.url(), title: await page.title(), screenshot: file });
    console.log(`${n} ok  ${page.url()}`);
  } catch (e) {
    const msg = String(e.message).split("\n")[0];
    await page.screenshot({ path: path.join(runDir, `${n}-error.png`), fullPage: true }).catch(() => {});
    log.push({ n, step: s, error: msg });
    console.error(`${n} FAIL ${msg}`);
    break;
  }
}

fs.writeFileSync(path.join(runDir, "log.json"), JSON.stringify(log, null, 2));
console.log(`Saved to ${runDir}`);
await ctx.close();
