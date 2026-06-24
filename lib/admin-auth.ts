import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, createHmac, timingSafeEqual } from "crypto";

const COOKIE = "chs_admin";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** True when an admin password has been configured via env. */
export function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function secret() {
  // A dedicated session secret is preferred; fall back to the password itself
  // (knowing the password already grants access, so it's an acceptable key).
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

/** The opaque session token a logged-in admin carries. */
function sessionToken() {
  return createHmac("sha256", secret())
    .update("chs-admin-session-v1")
    .digest("hex");
}

/** Constant-time password check (hash both sides so lengths match). */
export function verifyPassword(input: string) {
  const pw = process.env.ADMIN_PASSWORD || "";
  if (!pw) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(pw).digest();
  return timingSafeEqual(a, b);
}

export async function isAuthed() {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const expected = sessionToken();
  if (value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export async function startSession() {
  (await cookies()).set(COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** Guard for protected pages/actions — redirects to the login page if not authed. */
export async function requireAdmin() {
  if (!(await isAuthed())) redirect("/admin/login");
}
