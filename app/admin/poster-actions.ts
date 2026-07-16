"use server";

// Kept separate from actions.ts: any admin page that imports so much as one
// export from a "use server" file bundles that whole file's dependency graph
// into its serverless function. sharp ships a ~25MB native binary per
// platform, so bundling it into every admin route (including ones that have
// nothing to do with images, like /admin/login) was inflating their cold
// starts. Only pages that actually render PosterImageField pay that cost now.

import { randomUUID } from "crypto";
import sharp from "sharp";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

function str(v: FormDataEntryValue | null) {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
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
  // Upload as a Blob, not a raw Node Buffer: storage-js's Buffer code path
  // passes the body straight to fetch(), which was silently mangling binary
  // data (every non-UTF8-safe byte replaced with U+FFFD, corrupting the
  // file). Blob routes through storage-js's FormData/multipart path instead.
  const { error: upErr } = await admin.storage
    .from("posters")
    .upload(path, new Blob([new Uint8Array(resized)], { type: "image/webp" }), {
      contentType: "image/webp",
    });
  if (upErr) {
    console.error("ingestPosterImage upload error:", upErr);
    return { error: `Upload failed: ${upErr.message}` };
  }

  const { data } = admin.storage.from("posters").getPublicUrl(path);
  return { url: data.publicUrl };
}
