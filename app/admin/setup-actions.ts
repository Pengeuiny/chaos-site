"use server";

import { redirect } from "next/navigation";
import { hasAnyAdminAccount, verifySetupKey, setupKeyConfigured } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

function str(v: FormDataEntryValue | null) {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

/**
 * One-time bootstrap: creates the very first admin account. Gated by the
 * ADMIN_PASSWORD env var as a setup key (not an ongoing login path — that's
 * fully replaced by Supabase Auth) and only reachable while admin_profiles
 * is empty. The instant an account exists, this goes permanently inert.
 */
export async function createFirstAdmin(formData: FormData) {
  if (await hasAnyAdminAccount()) redirect("/admin/login");
  if (!setupKeyConfigured()) redirect("/admin/setup?error=config");

  const setupKey = (formData.get("setup_key") ?? "").toString();
  if (!verifySetupKey(setupKey)) redirect("/admin/setup?error=key");

  const name = str(formData.get("name"));
  const email = str(formData.get("email"));
  const password = (formData.get("password") ?? "").toString();
  if (!name) redirect("/admin/setup?error=name");
  if (!email) redirect("/admin/setup?error=email");
  if (password.length < 8) redirect("/admin/setup?error=password");

  const admin = createAdminClient();
  if (!admin) redirect("/admin/setup?error=nodb");

  // Double-check under the service-role client too, closing the tiny race
  // where two people submit the setup form at nearly the same instant.
  if (await hasAnyAdminAccount()) redirect("/admin/login");

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) redirect("/admin/setup?error=create");

  const { error: profileError } = await admin.from("admin_profiles").insert({
    id: data.user.id,
    name,
    role: "admin",
    is_active: true,
  });
  if (profileError) redirect("/admin/setup?error=create");

  redirect("/admin/login?ok=setup");
}
