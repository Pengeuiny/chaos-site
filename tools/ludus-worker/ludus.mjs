// Ludus admin recipes, driven by Playwright. Every selector here was verified
// against the live Ludus admin on 2026-09-16 (see tools/ludus-docs/out for the
// captured screens). Each recipe records a screenshot per step into `steps`
// so the site can show exactly what was clicked.

import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ORIGIN = process.env.LUDUS_ORIGIN || "https://cuthbertsontheatre.ludus.com";
const PROFILE_DIR = path.join(here, ".profile");

export class NeedsAttention extends Error {}

export async function openBrowser() {
  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless: process.env.LUDUS_HEADLESS === "1",
    viewport: { width: 1400, height: 900 },
  });
}

async function isChallenge(page) {
  if (/just a moment/i.test(await page.title().catch(() => ""))) return true;
  return (await page.locator("#challenge-running, #challenge-error-text, .cf-turnstile").count()) > 0;
}

async function isLoginPage(page) {
  if (/\/admin\/login/i.test(page.url())) return true;
  return (await page.locator('input[type="password"]:visible').count()) > 0;
}

async function dismissCookieBanner(page) {
  const btn = page.getByRole("button", { name: /essentials only/i });
  if (await btn.count()) await btn.first().click({ timeout: 2000 }).catch(() => {});
}

/** A step recorder: `await step("label")` screenshots the current page. */
export function recorder(page, steps) {
  return async (label) => {
    const png = await page.screenshot({ fullPage: false }).catch(() => null);
    steps.push({ label, png_base64: png ? png.toString("base64") : undefined });
  };
}

async function goto(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);
  if (await isChallenge(page)) {
    await page.waitForTimeout(8000); // a non-interactive challenge usually clears itself
    if (await isChallenge(page)) throw new NeedsAttention(`Cloudflare challenge at ${url}`);
  }
  await dismissCookieBanner(page);
}

/** Make sure the admin session is live, signing in with env credentials if needed. */
export async function ensureAdmin(page) {
  await goto(page, `${ORIGIN}/admin/shows.php`);
  if (!(await isLoginPage(page))) return;
  const user = process.env.LUDUS_ADMIN_USER, pass = process.env.LUDUS_ADMIN_PASS;
  if (!user || !pass) throw new NeedsAttention("Not signed in and LUDUS_ADMIN_USER/PASS are not set");
  const userField = page.locator('input[name*="user" i]:visible, input[name*="email" i]:visible, input[type="email"]:visible').first();
  const passField = page.locator('input[type="password"]:visible').first();
  if (await userField.count()) await userField.fill(user);
  await passField.fill(pass);
  await Promise.all([page.waitForLoadState("networkidle").catch(() => {}), passField.press("Enter")]);
  await page.waitForTimeout(2500);
  if (await isLoginPage(page)) throw new NeedsAttention("Ludus admin login failed — check credentials");
}

// ---------------------------------------------------------------- forms

/** Create a custom form with the given fields. Returns { form_id }. */
export async function createForm(page, form, step) {
  await goto(page, `${ORIGIN}/admin/create_form.php`);
  await page.locator('input[name="form_name"]').fill(form.name);
  await step(`Form: name "${form.name}"`);
  await Promise.all([page.waitForLoadState("networkidle").catch(() => {}), page.locator('input[type="submit"][value*="Create"]').click()]);
  await page.waitForTimeout(1500);
  const formId = page.url().match(/form_id=(\d+)/)?.[1];
  if (!formId) throw new Error(`Form was not created (landed on ${page.url()})`);

  const panel = page.locator(".fb-edit-field-wrapper");
  const canvas = () => page.evaluate(() => [...document.querySelectorAll(".fb-field-wrapper")].map((f) => f.innerText.trim().replace(/\s+/g, " ")).filter(Boolean));

  for (const f of form.fields) {
    await page.getByText("Add new field", { exact: true }).first().click();
    await page.waitForTimeout(300);
    await page.locator(`a.fb-button[data-field-type="${f.type}"]`).click();
    await page.waitForTimeout(600);
    const label = panel.locator('input[data-rv-input="model.label"]');
    await label.fill(f.label);
    await label.press("Tab");
    const req = panel.locator('input[data-rv-checked="model.required"]');
    if ((await req.isChecked()) !== Boolean(f.required)) await req.click();
    if (f.options?.length) {
      const opts = () => panel.locator("input.option-label-input");
      for (let g = 0; (await opts().count()) < f.options.length && g < 20; g++) { await panel.locator("a.js-add-option").last().click(); await page.waitForTimeout(150); }
      for (let g = 0; (await opts().count()) > f.options.length && g < 20; g++) { await panel.locator("a.js-remove-option").last().click(); await page.waitForTimeout(150); }
      if ((await opts().count()) !== f.options.length) throw new Error(`Could not set ${f.options.length} options on "${f.label}"`);
      for (const [j, o] of f.options.entries()) { const inp = opts().nth(j); await inp.fill(o); await inp.press("Tab"); }
    }
    await page.waitForTimeout(300);
    await step(`Form: added field "${f.label}"`);
  }
  const save = page.locator(".js-save-form");
  if (!/All changes saved/i.test(await save.innerText())) {
    await save.click();
    await page.waitForFunction(() => /All changes saved/i.test(document.querySelector(".js-save-form")?.innerText || ""), null, { timeout: 20000 });
  }
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const labels = await canvas();
  for (const f of form.fields) {
    if (!labels.some((l) => l.startsWith(f.label))) throw new Error(`Field "${f.label}" missing after save`);
  }
  await step("Form: saved and verified");
  return { form_id: formId };
}

// ---------------------------------------------------------- collections

function toLudusDate(yyyy_mm_dd) {
  const [y, m, d] = yyyy_mm_dd.split("-");
  return `${m}/${d}/${y}`;
}
function toLudusTime(hhmm) {
  const [h24, min] = hhmm.split(":").map(Number);
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour: `${h12}:${String(min).padStart(2, "0")}`, ampm };
}

/** Create a Standard collection (Off by default). Returns { show_id }. */
export async function createCollection(page, spec, formId, step) {
  await goto(page, `${ORIGIN}/admin/collections/create`);
  await page.locator("#show_name").fill(spec.name);

  const date = page.locator("#collection_date");
  await date.click(); await date.fill(toLudusDate(spec.deadline_date)); await date.press("Tab");
  await page.waitForTimeout(300);

  const { hour, ampm } = toLudusTime(spec.deadline_time);
  const hourDd = page.locator(".options-dropdown", { has: page.locator('input[name=collection_time_hour]') });
  await hourDd.locator(".options-dropdown-title").click(); await page.waitForTimeout(400);
  await hourDd.locator(`.dropdown-item[data-value="${hour}"]`).click();
  await page.waitForTimeout(300);
  if ((await page.locator('input[name=collection_time_ampm]').inputValue()) !== ampm) {
    const ampmDd = page.locator(".options-dropdown", { has: page.locator('input[name=collection_time_ampm]') });
    await ampmDd.locator(".options-dropdown-title").click(); await page.waitForTimeout(300);
    await ampmDd.locator(`.dropdown-item[data-value="${ampm}"]`).click();
  }

  if (formId) {
    await page.locator("#form_type-existing").check();
    await page.waitForTimeout(300);
    await page.locator('select[name="form_id"]').selectOption(String(formId));
  }

  const state = await page.evaluate(() => ({
    date: document.querySelector("#collection_date").value,
    hour: document.querySelector("input[name=collection_time_hour]").value,
    ampm: document.querySelector("input[name=collection_time_ampm]").value,
    form: [...document.querySelectorAll("[name=form_id]")].map((e) => `${e.tagName}=${e.value}${e.disabled ? "(disabled)" : ""}`).join(","),
  }));
  const formOk = !formId || (state.form.includes(`SELECT=${formId}`) && state.form.includes("INPUT=0(disabled)"));
  if (state.date !== toLudusDate(spec.deadline_date) || state.hour !== hour || state.ampm !== ampm || !formOk) {
    throw new Error(`Collection form not filled as intended: ${JSON.stringify(state)}`);
  }
  await step(`Collection: filled "${spec.name}" (deadline ${state.date} ${state.hour} ${state.ampm})`);

  await Promise.all([page.waitForLoadState("networkidle").catch(() => {}), page.locator('form[action$="/admin/collections"] button[type=submit]:visible').last().click()]);
  await page.waitForTimeout(1500);
  const showId = page.url().match(/\/admin\/shows\/(\d+)\/pricing/)?.[1];
  if (!showId) throw new Error(`Collection was not created (landed on ${page.url()})`);
  await step("Collection: created, on the pricing page");
  return { show_id: showId };
}

export async function addFee(page, showId, fee, step) {
  await goto(page, `${ORIGIN}/admin/add_price.php?show_id=${showId}&type=ticket`);
  await page.locator('input[name="name"]').fill(fee.name);
  await page.locator('input[name="price"]').fill(String(fee.price));
  if (fee.description) await page.locator('input[name="description"]').fill(fee.description);
  await step(`Fee: "${fee.name}" $${fee.price.toFixed(2)}`);
  await Promise.all([page.waitForLoadState("networkidle").catch(() => {}), page.locator('input[type="submit"][value="Done"]').click()]);
  await page.waitForTimeout(1000);
  if (!/\/pricing/.test(page.url())) throw new Error(`Fee "${fee.name}" was not saved (landed on ${page.url()})`);
}

/** Confirm the collection is Off and gather its links. */
export async function finishCollection(page, showId, step) {
  await goto(page, `${ORIGIN}/admin/shows/${showId}/pricing`);
  await step("Fees: final list");
  await goto(page, `${ORIGIN}/admin/collections.php?type=standard`);
  const turnOn = await page.locator(`a[href*="on_off_show_submit.php?show_id=${showId}&"]`).first().innerText().catch(() => "");
  if (!/turn on/i.test(turnOn)) throw new Error(`Expected the collection to be Off; the toggle reads "${turnOn}"`);
  await step("Collections list: shows Off");
  await goto(page, `${ORIGIN}/admin/shows/${showId}/share`);
  const shareLinks = await page.evaluate(() => [...document.querySelectorAll("input[readonly], input[type=text]")].map((e) => e.value).filter((v) => /^https?:/.test(v)));
  const links = {
    "Settings (admin)": `${ORIGIN}/admin/collections/${showId}/edit`,
    "Fees (admin)": `${ORIGIN}/admin/shows/${showId}/pricing`,
    "Turn On (collections list)": `${ORIGIN}/admin/collections.php?type=standard`,
    "Public link (once On)": shareLinks[0] || `${ORIGIN}/${showId}`,
  };
  if (shareLinks[1]) links["Private preview link"] = shareLinks[1];
  return links;
}

/** Full recipe for a `collection` job. Returns { links, ids }. */
export async function runCollectionJob(page, spec, steps) {
  const step = recorder(page, steps);
  await ensureAdmin(page);
  const ids = {};
  if (spec.form) {
    const { form_id } = await createForm(page, spec.form, step);
    ids.form_id = form_id;
  }
  const { show_id } = await createCollection(page, spec, ids.form_id, step);
  ids.show_id = show_id;
  for (const fee of spec.fees) await addFee(page, show_id, fee, step);
  const links = await finishCollection(page, show_id, step);
  if (ids.form_id) links["Form (admin)"] = `${ORIGIN}/admin/form_dashboard.php?form_id=${ids.form_id}`;
  return { links, ids };
}
