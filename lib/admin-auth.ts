import { redirect } from "next/navigation";
import { createHash, timingSafeEqual } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminRole = "admin" | "editor" | "treasurer" | "viewer";

export type CurrentAdmin = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
};

/** True when the one-time setup key (reused ADMIN_PASSWORD env var) is configured. */
export function setupKeyConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

/**
 * Constant-time check of the one-time /admin/setup key. This is the *only*
 * remaining use of ADMIN_PASSWORD — it exists purely to bootstrap the first
 * real admin_profiles account (see hasAnyAdminAccount below), not as an
 * ongoing login path.
 */
export function verifySetupKey(input: string) {
  const pw = process.env.ADMIN_PASSWORD || "";
  if (!pw) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(pw).digest();
  return timingSafeEqual(a, b);
}

/** True once at least one admin account exists — /admin/setup goes inert after this. */
export async function hasAnyAdminAccount(): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const { count } = await admin
    .from("admin_profiles")
    .select("id", { count: "exact", head: true });
  return (count ?? 0) > 0;
}

/**
 * The currently logged-in admin, resolved from the Supabase Auth session
 * (validated via getClaims(), which checks the JWT signature) plus their
 * admin_profiles row. Returns null if unauthenticated, the profile is
 * missing, or the account has been deactivated.
 */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  const { data: profile } = await admin
    .from("admin_profiles")
    .select("name, role, is_active")
    .eq("id", claims.sub)
    .single();
  if (!profile || !profile.is_active) return null;

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    name: profile.name,
    role: profile.role as AdminRole,
  };
}

/** Guard for protected pages — any active admin account may view. Redirects to login otherwise. */
export async function requireAdmin(): Promise<CurrentAdmin> {
  const current = await getCurrentAdmin();
  if (!current) redirect("/admin/login");
  return current;
}

/** Guard for mutating actions — redirects if the current user's role isn't in `allowed`. */
export async function requireRole(allowed: AdminRole[]): Promise<CurrentAdmin> {
  const current = await requireAdmin();
  if (!allowed.includes(current.role)) redirect("/admin?error=forbidden");
  return current;
}
