"use client";

import { useRef, useState } from "react";
import { ingestPersonPhoto } from "./photo-actions";
import styles from "./admin.module.css";

/**
 * Board/ITS member photo field: paste a URL or drag/drop-or-click an
 * upload. Either path is fetched, cropped to a square headshot, and
 * re-stored in our own Supabase Storage bucket (via ingestPersonPhoto) so
 * the site never hot-links arbitrary external images. The resulting
 * storage URL rides along as a hidden `image_url` input in the parent form.
 */
export default function PersonPhotoField({
  defaultValue,
}: {
  defaultValue?: string | null;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [pastedUrl, setPastedUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function ingest(fd: FormData) {
    setPending(true);
    setError(null);
    const res = await ingestPersonPhoto(fd);
    setPending(false);
    if (res.error) setError(res.error);
    else if (res.url) setUrl(res.url);
  }

  function onFetchUrl() {
    const trimmed = pastedUrl.trim();
    if (!trimmed) return;
    const fd = new FormData();
    fd.set("source_url", trimmed);
    ingest(fd);
  }

  function onFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    ingest(fd);
  }

  return (
    <div className={styles.label}>
      Photo <span className={styles.hint}>(optional)</span>
      <input type="hidden" name="image_url" value={url} readOnly />

      <div className={styles.posterTabs}>
        <button
          type="button"
          className={mode === "url" ? styles.posterTabActive : styles.posterTab}
          onClick={() => setMode("url")}
        >
          Paste URL
        </button>
        <button
          type="button"
          className={mode === "upload" ? styles.posterTabActive : styles.posterTab}
          onClick={() => setMode("upload")}
        >
          Upload
        </button>
      </div>

      {mode === "url" ? (
        <div className={styles.posterUrlRow}>
          <input
            className={styles.input}
            placeholder="https://…"
            value={pastedUrl}
            onChange={(e) => setPastedUrl(e.target.value)}
          />
          <button
            type="button"
            className={styles.btn}
            disabled={pending || !pastedUrl.trim()}
            onClick={onFetchUrl}
          >
            {pending ? "Fetching…" : "Fetch & store"}
          </button>
        </div>
      ) : (
        <div
          className={`${styles.dropzone}${dragOver ? ` ${styles.dropzoneOver}` : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onFiles(e.target.files)}
          />
          {pending ? "Uploading…" : "Drag & drop an image, or click to choose one"}
        </div>
      )}

      {error && <p className={styles.inlineError}>{error}</p>}

      {url && (
        <div className={styles.personPhotoPreview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Photo preview" />
        </div>
      )}
    </div>
  );
}
