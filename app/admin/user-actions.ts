"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole, type AdminRole } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

const ROLES: AdminRole[] = ["admin", "editor", "treasurer", "viewer"];

function str(v: FormDataEntryValue | null) {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

/** How many *other* active admins exist besides `excludeId` — guards against locking everyone out. */
async function otherActiveAdminCount(admin: ReturnType<typeof createAdminClient>, excludeId: string) {
  if (!admin) return 0;
  const { count } = await admin
    .from("admin_profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("is_active", true)
    .neq("id", excludeId);
  return count ?? 0;
}

export async function createAdminUser(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin/users?error=nodb");

  const name = str(formData.get("name"));
  const email = str(formData.get("email"));
  const password = (formData.get("password") ?? "").toString();
  const role = str(formData.get("role"));
  if (!name) redirect("/admin/users?error=name");
  if (!email) redirect("/admin/users?error=email");
  if (password.length < 8) redirect("/admin/users?error=password");
  if (!role || !ROLES.includes(role as AdminRole)) redirect("/admin/users?error=role");

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) redirect("/admin/users?error=create");

  const { data: profile, error: profileError } = await admin
    .from("admin_profiles")
    .insert({ id: data.user.id, name, role, is_active: true })
    .select()
    .single();
  if (profileError) redirect("/admin/users?error=create");

  await logAudit(admin, actor, {
    table: "admin_profiles",
    rowId: data.user.id,
    action: "insert",
    after: { ...profile, email },
  });
  revalidatePath("/admin/users");
  redirect("/admin/users?ok=added");
}

export async function updateAdminUser(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin/users?error=nodb");

  const id = str(formData.get("id"));
  const name = str(formData.get("name"));
  const role = str(formData.get("role"));
  const is_active = formData.get("is_active") === "on";
  if (!id) redirect("/admin/users?error=save");
  if (!name) redirect("/admin/users?error=name");
  if (!role || !ROLES.includes(role as AdminRole)) redirect("/admin/users?error=role");

  const { data: before } = await admin.from("admin_profiles").select("*").eq("id", id).single();
  if (before?.role === "admin" && before.is_active && (role !== "admin" || !is_active)) {
    if ((await otherActiveAdminCount(admin, id)) === 0) {
      redirect("/admin/users?error=lastadmin");
    }
  }

  const { data: after, error } = await admin
    .from("admin_profiles")
    .update({ name, role, is_active })
    .eq("id", id)
    .select()
    .single();

  if (error) redirect("/admin/users?error=save");
  await logAudit(admin, actor, { table: "admin_profiles", rowId: id, action: "update", before, after });
  revalidatePath("/admin/users");
  redirect("/admin/users?ok=updated");
}

export async function resetAdminUserPassword(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin/users?error=nodb");

  const id = str(formData.get("id"));
  const password = (formData.get("password") ?? "").toString();
  if (!id) redirect("/admin/users?error=save");
  if (password.length < 8) redirect("/admin/users?error=password");

  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) redirect("/admin/users?error=save");

  // Never log the actual password — just that a reset happened.
  await logAudit(admin, actor, {
    table: "admin_profiles",
    rowId: id,
    action: "update",
    before: { passwordReset: false },
    after: { passwordReset: true },
  });
  revalidatePath("/admin/users");
  redirect("/admin/users?ok=passwordreset");
}
