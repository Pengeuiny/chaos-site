import { openContext, ORIGIN, isChallenge } from "./common.mjs";

// Signs into the Ludus admin on the shared profile. Credentials come from
// LUDUS_ADMIN_USER / LUDUS_ADMIN_PASS so they never land in the repo.
const user = process.env.LUDUS_ADMIN_USER;
const pass = process.env.LUDUS_ADMIN_PASS;
if (!user || !pass) { console.error("Set LUDUS_ADMIN_USER and LUDUS_ADMIN_PASS"); process.exit(1); }

const ctx = await openContext();
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto(`${ORIGIN}/admin/login`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
if (await isChallenge(page)) { console.error("Cloudflare challenge on admin login — run `npm run login` first."); await ctx.close(); process.exit(2); }

const userField = page.locator('input[name*="user" i], input[name*="email" i], input[type="email"], input[type="text"]').first();
const passField = page.locator('input[type="password"]').first();
await userField.fill(user);
await passField.fill(pass);
await Promise.all([
  page.waitForLoadState("networkidle").catch(() => {}),
  passField.press("Enter"),
]);
await page.waitForTimeout(3000);
const stillLogin = /\/admin\/login/i.test(page.url()) || (await passField.count()) > 0;
console.log(stillLogin ? `Login did not stick — still at ${page.url()}` : `Admin signed in — now at ${page.url()}`);
console.log("title:", await page.title());
await page.screenshot({ path: "out/admin-landing.png", fullPage: true });
await ctx.close();
process.exit(stillLogin ? 3 : 0);
