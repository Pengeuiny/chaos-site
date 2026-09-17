import { openContext, LOGIN_URL, isLoginPage } from "./common.mjs";

// Headed, one-time step. Opens real Chrome on the persistent profile; the
// human clears the Cloudflare check and signs in. Exits once the browser is
// closed, or as soon as a signed-in page is detected.
const ctx = await openContext({ headless: false });
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded" });
console.log("Chrome is open. Clear the Cloudflare check and sign in, then close the window (or wait).");

let closed = false;
ctx.on("close", () => { closed = true; });

for (let i = 0; i < 600 && !closed; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  try {
    if (!(await isLoginPage(page))) {
      console.log(`Signed in — now at ${page.url()}`);
      await new Promise((r) => setTimeout(r, 2000)); // let cookies settle
      break;
    }
  } catch { /* page navigating */ }
}
if (!closed) await ctx.close();
console.log("Profile saved. Headless runs can now reuse it.");
