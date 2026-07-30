"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { easternWallToUtcIso } from "@/lib/format";
import { postToFacebook, postToInstagram, type PostResult } from "@/lib/social";

const CONTENT_ROLES = ["admin", "editor"] as const;

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
  const email = str(formData.get("email"));
  const password = (formData.get("password") ?? "").toString();
  if (!email || !password) redirect("/admin/login?error=1");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/admin/login?error=1");
  redirect("/admin");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/** Parse every editable show field from a submitted form (shared by create/update). */
function showFieldsFrom(formData: FormData) {
  const title = str(formData.get("title"));
  const dates_tbd = formData.get("dates_tbd") === "on";
  return {
    slug: slugify(str(formData.get("slug")) || title || ""),
    program: (formData.get("program") ?? "").toString(),
    title,
    type: str(formData.get("type")),
    accent: str(formData.get("accent")),
    venue: str(formData.get("venue")),
    address: str(formData.get("address")),
    tagline: str(formData.get("tagline")),
    synopsis: str(formData.get("synopsis")),
    ticket_url: str(formData.get("ticket_url")),
    poster_url: str(formData.get("poster_url")),
    starts_on: dates_tbd ? null : str(formData.get("starts_on")),
    ends_on: dates_tbd ? null : str(formData.get("ends_on")),
    dates_tbd,
    date_range: dates_tbd ? str(formData.get("date_range")) : null,
    has_microsite: formData.get("has_microsite") === "on",
    cast_is_sample: formData.get("cast_is_sample") === "on",
    is_performance: formData.get("is_performance") === "on",
    sort_order: Number(formData.get("sort_order") || 0),
  };
}

export async function createShow(formData: FormData) {
  const actor = await requireRole([...CONTENT_ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin?error=nodb");

  const fields = showFieldsFrom(formData);
  if (!fields.title) redirect("/admin?error=title");
  if (fields.program !== "theatre" && fields.program !== "choir")
    redirect("/admin?error=program");
  if (!fields.dates_tbd && (!fields.starts_on || !fields.ends_on))
    redirect("/admin?error=dates");

  const { data, error } = await admin.from("productions").insert(fields).select().single();
  if (error) {
    const code = error.code === "23505" ? "dupe" : "show";
    redirect(`/admin?error=${code}`);
  }
  await logAudit(admin, actor, { table: "productions", rowId: data.id, action: "insert", after: data });
  revalidatePath("/");
  redirect("/admin?ok=show");
}

export async function updateShow(formData: FormData) {
  const actor = await requireRole([...CONTENT_ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin?error=nodb");

  const id = str(formData.get("id"));
  if (!id) redirect("/admin?error=show");

  const fields = showFieldsFrom(formData);
  if (!fields.title) redirect(`/admin/shows/${id}?error=title`);
  if (fields.program !== "theatre" && fields.program !== "choir")
    redirect(`/admin/shows/${id}?error=program`);
  if (!fields.dates_tbd && (!fields.starts_on || !fields.ends_on))
    redirect(`/admin/shows/${id}?error=dates`);

  const { data: before } = await admin.from("productions").select("*").eq("id", id).single();
  const { data: after, error } = await admin
    .from("productions")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    const code = error.code === "23505" ? "dupe" : "show";
    redirect(`/admin/shows/${id}?error=${code}`);
  }
  await logAudit(admin, actor, { table: "productions", rowId: id, action: "update", before, after });
  revalidatePath("/");
  revalidatePath(`/shows/${fields.slug}`);
  redirect("/admin?ok=updated");
}

export async function addEvent(formData: FormData) {
  const actor = await requireRole([...CONTENT_ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin/events?error=nodb");

  const production_id = str(formData.get("production_id"));
  const starts_tbd = formData.get("starts_tbd") === "on";
  const local = str(formData.get("starts_at")); // "YYYY-MM-DDTHH:MM"
  const label = str(formData.get("label"));
  if (!production_id) redirect("/admin/events?error=prod");
  if (!starts_tbd && !local) redirect("/admin/events?error=when");
  if (starts_tbd && !label) redirect("/admin/events?error=label");

  const { data, error } = await admin
    .from("showtimes")
    .insert({
      production_id,
      starts_at: starts_tbd || !local ? null : easternWallToUtcIso(local),
      starts_tbd,
      label,
      ticket_url: str(formData.get("ticket_url")),
      sort_order: Number(formData.get("sort_order") || 0),
    })
    .select()
    .single();

  if (error) redirect("/admin/events?error=event");
  await logAudit(admin, actor, { table: "showtimes", rowId: data.id, action: "insert", after: data });
  revalidatePath("/");
  redirect("/admin/events?ok=event");
}

/**
 * Publish a show's poster + caption to the selected platforms. Returns a
 * per-platform result so the UI can show exactly what succeeded/failed —
 * one platform failing shouldn't hide that the other one worked.
 */
export async function publishSocialPost(formData: FormData): Promise<{
  facebook?: PostResult;
  instagram?: PostResult;
  error?: string;
}> {
  const actor = await requireRole([...CONTENT_ROLES]);
  const admin = createAdminClient();
  if (!admin) return { error: "Storage isn't configured." };

  const production_id = str(formData.get("production_id"));
  const caption = str(formData.get("caption"));
  const wantFacebook = formData.get("facebook") === "on";
  const wantInstagram = formData.get("instagram") === "on";

  if (!production_id) return { error: "Pick a show." };
  if (!caption) return { error: "Write a caption." };
  if (!wantFacebook && !wantInstagram) return { error: "Pick at least one platform." };

  const { data: production } = await admin
    .from("productions")
    .select("poster_url")
    .eq("id", production_id)
    .single();
  const imageUrl = production?.poster_url as string | null | undefined;
  if (!imageUrl) return { error: "This show has no poster image to post yet." };

  const result: { facebook?: PostResult; instagram?: PostResult } = {};
  if (wantFacebook) result.facebook = await postToFacebook(imageUrl, caption);
  if (wantInstagram) result.instagram = await postToInstagram(imageUrl, caption);
  await logAudit(admin, actor, {
    table: "social_posts",
    rowId: production_id,
    action: "insert",
    after: { caption, facebook: wantFacebook, instagram: wantInstagram, result },
  });
  return result;
}

export async function updateEvent(formData: FormData) {
  const actor = await requireRole([...CONTENT_ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin/events?error=nodb");

  const id = str(formData.get("id"));
  const starts_tbd = formData.get("starts_tbd") === "on";
  const local = str(formData.get("starts_at"));
  const label = str(formData.get("label"));
  if (!id) redirect("/admin/events?error=event");
  if (!starts_tbd && !local) redirect("/admin/events?error=when");
  if (starts_tbd && !label) redirect("/admin/events?error=label");

  const { data: before } = await admin.from("showtimes").select("*").eq("id", id).single();
  const { data: after, error } = await admin
    .from("showtimes")
    .update({
      starts_at: starts_tbd || !local ? null : easternWallToUtcIso(local),
      starts_tbd,
      label,
      ticket_url: str(formData.get("ticket_url")),
      sort_order: Number(formData.get("sort_order") || 0),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) redirect("/admin/events?error=event");
  await logAudit(admin, actor, { table: "showtimes", rowId: id, action: "update", before, after });
  revalidatePath("/");
  redirect("/admin/events?ok=event");
}

export async function deleteEvent(formData: FormData) {
  const actor = await requireRole([...CONTENT_ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin/events?error=nodb");
  const id = str(formData.get("id"));
  if (id) {
    const { data: before } = await admin.from("showtimes").select("*").eq("id", id).single();
    await admin.from("showtimes").delete().eq("id", id);
    await logAudit(admin, actor, { table: "showtimes", rowId: id, action: "delete", before });
  }
  revalidatePath("/");
  redirect("/admin/events?ok=deleted");
}

export async function deleteShow(formData: FormData) {
  const actor = await requireRole([...CONTENT_ROLES]);
  const admin = createAdminClient();
  if (!admin) redirect("/admin?error=nodb");
  const id = str(formData.get("id"));
  if (id) {
    const { data: before } = await admin.from("productions").select("*").eq("id", id).single();
    await admin.from("productions").delete().eq("id", id); // cascades
    await logAudit(admin, actor, { table: "productions", rowId: id, action: "delete", before });
  }
  revalidatePath("/");
  redirect("/admin?ok=deleted");
}
