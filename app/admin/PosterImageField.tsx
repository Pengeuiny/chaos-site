"use client";

import { useRef, useState } from "react";
import { ingestPosterImage } from "./actions";
import styles from "./admin.module.css";

/**
 * Poster image field: paste a URL or drag/drop-or-click an upload. Either
 * path is fetched, resized, and re-stored in our own Supabase Storage bucket
 * (via ingestPosterImage) so the site never hot-links arbitrary external
 * images. The resulting storage URL rides along as a hidden `poster_url`
 * input in the parent show form.
 */
export default function PosterImageField({
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
    const res = await ingestPosterImage(fd);
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
      Poster image
      <input type="hidden" name="poster_url" value={url} readOnly />

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
        <div className={styles.posterPreview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Poster preview" />
        </div>
      )}
    </div>
  );
}
