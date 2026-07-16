"use server";

// Kept separate from actions.ts/people-actions.ts for the same reason as
// poster-actions.ts: importing sharp bundles its ~25MB native binary into
// whatever route references this file, so it's isolated to just the pages
// that render PersonPhotoField.

import { randomUUID } from "crypto";
import sharp from "sharp";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

function str(v: FormDataEntryValue | null) {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

const MAX_PHOTO_BYTES = 12 * 1024 * 1024; // 12MB, ahead of the resize step

/**
 * Ingest a board/ITS member photo from either an uploaded file or a source
 * URL: fetch the bytes, crop to a square headshot, and store it in our own
 * Supabase Storage bucket so we control format/size instead of hot-linking.
 * Returns the resulting public URL, or an error message for the UI.
 */
export async function ingestPersonPhoto(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) return { error: "Storage isn't configured." };

  const file = formData.get("file");
  const sourceUrl = str(formData.get("source_url"));

  let bytes: Buffer;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PHOTO_BYTES) return { error: "Image is too large." };
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
    if (buf.byteLength > MAX_PHOTO_BYTES) return { error: "Image is too large." };
    bytes = Buffer.from(buf);
  } else {
    return { error: "Provide an image URL or file." };
  }

  let resized: Buffer;
  try {
    resized = await sharp(bytes)
      .resize({
        width: 500,
        height: 500,
        fit: "cover",
        position: "attention",
      })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return { error: "That doesn't look like a valid image." };
  }

  const path = `${randomUUID()}.webp`;
  // Upload as a Blob, not a raw Node Buffer: storage-js's Buffer code path
  // passes the body straight to fetch(), which was silently mangling binary
  // data (every non-UTF8-safe byte replaced with U+FFFD, corrupting the
  // file). Blob routes through storage-js's FormData/multipart path instead.
  const { error: upErr } = await admin.storage
    .from("people")
    .upload(path, new Blob([new Uint8Array(resized)], { type: "image/webp" }), {
      contentType: "image/webp",
    });
  if (upErr) {
    console.error("ingestPersonPhoto upload error:", upErr);
    return { error: `Upload failed: ${upErr.message}` };
  }

  const { data } = admin.storage.from("people").getPublicUrl(path);
  return { url: data.publicUrl };
}
