import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

export const ORIGIN = "https://cuthbertsontheatre.ludus.com";
export const LOGIN_URL = `${ORIGIN}/patron_login.php`;
export const PROFILE_DIR = path.join(here, ".profile");
export const OUT_DIR = path.join(here, "out");

/**
 * One real-Chrome profile shared by every script. `login` opens it headed so a
 * human can clear Cloudflare and sign in; the other scripts reopen the same
 * profile so the session cookie carries over.
 *
 * Headed is the default for every script: Cloudflare's managed challenge on
 * ludus.com re-challenges headless Chrome on each request (verified 2026-09),
 * while a headed real-Chrome window on this profile passes without prompting.
 * Set LUDUS_HEADLESS=1 to try headless anyway.
 */
export async function openContext({ headless = process.env.LUDUS_HEADLESS === "1" } = {}) {
  return chromium.launchPersistentContext(PROFILE_DIR, {
    channel: "chrome",
    headless,
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 1,
  });
}

/** True when the page is Cloudflare's "Just a moment" interstitial. */
export async function isChallenge(page) {
  const title = await page.title().catch(() => "");
  if (/just a moment/i.test(title)) return true;
  return page.locator("#challenge-running, #challenge-error-text, .cf-turnstile").count().then((n) => n > 0);
}

/** Cheap heuristic: a page that still shows the patron login form is not signed in. */
export async function isLoginPage(page) {
  if (/patron_login|\/admin\/login/i.test(page.url())) return true;
  // Only a *visible* password field counts: admin pages such as Admin Users
  // carry a hidden password input inside an "Add User" dialog.
  return page.locator('input[type="password"]:visible').count().then((n) => n > 0);
}

/**
 * If the page is a login form and LUDUS_ADMIN_USER / LUDUS_ADMIN_PASS are set,
 * sign in and return true. Some admin pages (Users, Admins) bounce to the
 * login even mid-session and need the password re-entered.
 */
export async function reauthIfNeeded(page) {
  const user = process.env.LUDUS_ADMIN_USER, pass = process.env.LUDUS_ADMIN_PASS;
  if (!user || !pass) return false;
  const passField = page.locator('input[type="password"]:visible').first();
  if (!(await passField.count())) return false;
  const userField = page.locator('input[name*="user" i]:visible, input[name*="email" i]:visible, input[type="email"]:visible').first();
  if (await userField.count()) await userField.fill(user);
  await passField.fill(pass);
  await Promise.all([page.waitForLoadState("networkidle").catch(() => {}), passField.press("Enter")]);
  await page.waitForTimeout(2000);
  return true;
}

/** Dismiss Ludus's cookie-consent banner so it doesn't sit over every screenshot. */
export async function dismissCookieBanner(page) {
  const btn = page.getByRole("button", { name: /essentials only/i });
  if (await btn.count()) await btn.first().click({ timeout: 2000 }).catch(() => {});
}

export function slugify(s) {
  return s.toLowerCase().replace(/^https?:\/\/[^/]+/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "root";
}
