"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  adminConfigured,
  verifyPassword,
  startSession,
  endSession,
  requireAdmin,
} from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { easternWallToUtcIso } from "@/lib/format";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function str(v: FormDataEntryValue | null) {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

export async function login(formData: FormData) {
  if (!adminConfigured()) redirect("/admin/login?error=config");
  const password = (formData.get("password") ?? "").toString();
  if (!verifyPassword(password)) redirect("/admin/login?error=1");
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

export async function createShow(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) redirect("/admin?error=nodb");

  const title = str(formData.get("title"));
  const program = (formData.get("program") ?? "").toString();
  if (!title) redirect("/admin?error=title");
  if (program !== "theatre" && program !== "choir")
    redirect("/admin?error=program");

  const slug = slugify(str(formData.get("slug")) || title);

  const { error } = await admin.from("productions").insert({
    slug,
    program,
    title,
    type: str(formData.get("type")),
    tag_text: str(formData.get("tag_text")),
    tag_class: str(formData.get("tag_class")),
    accent: str(formData.get("accent")),
    venue: str(formData.get("venue")),
    address: str(formData.get("address")),
    tagline: str(formData.get("tagline")),
    synopsis: str(formData.get("synopsis")),
    ticket_url: str(formData.get("ticket_url")),
    poster_url: str(formData.get("poster_url")),
    date_range: str(formData.get("date_range")),
    has_microsite: formData.get("has_microsite") === "on",
    cast_is_sample: formData.get("cast_is_sample") === "on",
    sort_order: Number(formData.get("sort_order") || 0),
  });

  if (error) {
    const code = error.code === "23505" ? "dupe" : "show";
    redirect(`/admin?error=${code}`);
  }
  revalidatePath("/");
  redirect("/admin?ok=show");
}

export async function addEvent(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) redirect("/admin?error=nodb");

  const production_id = str(formData.get("production_id"));
  const local = str(formData.get("starts_at")); // "YYYY-MM-DDTHH:MM"
  if (!production_id) redirect("/admin?error=prod");
  if (!local) redirect("/admin?error=when");

  const { error } = await admin.from("showtimes").insert({
    production_id,
    starts_at: easternWallToUtcIso(local),
    label: str(formData.get("label")),
    sort_order: Number(formData.get("sort_order") || 0),
  });

  if (error) redirect("/admin?error=event");
  revalidatePath("/");
  redirect("/admin?ok=event");
}

export async function deleteEvent(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) redirect("/admin?error=nodb");
  const id = str(formData.get("id"));
  if (id) await admin.from("showtimes").delete().eq("id", id);
  revalidatePath("/");
  redirect("/admin?ok=deleted");
}

export async function deleteShow(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) redirect("/admin?error=nodb");
  const id = str(formData.get("id"));
  if (id) await admin.from("productions").delete().eq("id", id); // cascades
  revalidatePath("/");
  redirect("/admin?ok=deleted");
}
