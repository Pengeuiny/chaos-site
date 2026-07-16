"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import sharp from "sharp";
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

/** Parse every editable show field from a submitted form (shared by create/update). */
function showFieldsFrom(formData: FormData) {
  const title = str(formData.get("title"));
  return {
    slug: slugify(str(formData.get("slug")) || title || ""),
    program: (formData.get("program") ?? "").toString(),
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
  };
}

export async function createShow(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) redirect("/admin?error=nodb");

  const fields = showFieldsFrom(formData);
  if (!fields.title) redirect("/admin?error=title");
  if (fields.program !== "theatre" && fields.program !== "choir")
    redirect("/admin?error=program");

  const { error } = await admin.from("productions").insert(fields);
  if (error) {
    const code = error.code === "23505" ? "dupe" : "show";
    redirect(`/admin?error=${code}`);
  }
  revalidatePath("/");
  redirect("/admin?ok=show");
}

export async function updateShow(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) redirect("/admin?error=nodb");

  const id = str(formData.get("id"));
  if (!id) redirect("/admin?error=show");

  const fields = showFieldsFrom(formData);
  if (!fields.title) redirect(`/admin/shows/${id}?error=title`);
  if (fields.program !== "theatre" && fields.program !== "choir")
    redirect(`/admin/shows/${id}?error=program`);

  const { error } = await admin.from("productions").update(fields).eq("id", id);
  if (error) {
    const code = error.code === "23505" ? "dupe" : "show";
    redirect(`/admin/shows/${id}?error=${code}`);
  }
  revalidatePath("/");
  revalidatePath(`/shows/${fields.slug}`);
  redirect("/admin?ok=updated");
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
    ticket_url: str(formData.get("ticket_url")),
    sort_order: Number(formData.get("sort_order") || 0),
  });

  if (error) redirect("/admin?error=event");
  revalidatePath("/");
  redirect("/admin?ok=event");
}

const MAX_POSTER_BYTES = 12 * 1024 * 1024; // 12MB, ahead of the resize step

/**
 * Ingest a poster image from either an uploaded file or a source URL: fetch
 * the bytes, resize to a sane max resolution, and store it in our own
 * Supabase Storage bucket so we control format/size instead of hot-linking.
 * Returns the resulting public URL, or an error message for the UI.
 */
export async function ingestPosterImage(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) return { error: "Storage isn't configured." };

  const file = formData.get("file");
  const sourceUrl = str(formData.get("source_url"));

  let bytes: Buffer;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_POSTER_BYTES) return { error: "Image is too large." };
    bytes = Buffer.from(await file.arrayBuffer());
  } else if (sourceUrl) {
    let res: Response;
    try {
      res = await fetch(sourceUrl);
    } catch {
      return { error: "Couldn't reach that URL." };
    }
    if (!res.ok) return { error: "Couldn't fetch that URL." };
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_POSTER_BYTES) return { error: "Image is too large." };
    bytes = Buffer.from(buf);
  } else {
    return { error: "Provide an image URL or file." };
  }

  let resized: Buffer;
  try {
    resized = await sharp(bytes)
      .resize({
        width: 900,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return { error: "That doesn't look like a valid image." };
  }

  const path = `${randomUUID()}.webp`;
  const { error: upErr } = await admin.storage
    .from("posters")
    .upload(path, resized, { contentType: "image/webp" });
  if (upErr) return { error: "Upload failed." };

  const { data } = admin.storage.from("posters").getPublicUrl(path);
  return { url: data.publicUrl };
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
