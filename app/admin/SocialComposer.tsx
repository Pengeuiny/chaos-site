"use client";

import { useState } from "react";
import { publishSocialPost } from "./actions";
import type { PostResult } from "@/lib/social";
import styles from "./admin.module.css";

type Show = {
  id: string;
  title: string;
  tagline: string | null;
  date_range: string | null;
  ticket_url: string | null;
  poster_url: string | null;
};

function captionFor(show?: Show) {
  if (!show) return "";
  const parts = [show.title];
  if (show.tagline) parts.push(show.tagline);
  if (show.date_range) parts.push(show.date_range);
  if (show.ticket_url) parts.push(`Tickets: ${show.ticket_url}`);
  return parts.join("\n\n");
}

export default function SocialComposer({
  shows,
  platforms,
}: {
  shows: Show[];
  platforms: { facebook: boolean; instagram: boolean };
}) {
  const [showId, setShowId] = useState(shows[0]?.id ?? "");
  const [caption, setCaption] = useState(() => captionFor(shows[0]));
  const [useFacebook, setUseFacebook] = useState(platforms.facebook);
  const [useInstagram, setUseInstagram] = useState(platforms.instagram);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{
    facebook?: PostResult;
    instagram?: PostResult;
    error?: string;
  } | null>(null);

  const selected = shows.find((s) => s.id === showId);

  function onShowChange(id: string) {
    setShowId(id);
    setCaption(captionFor(shows.find((s) => s.id === id)));
    setResult(null);
  }

  async function onPublish() {
    setPending(true);
    setResult(null);
    const fd = new FormData();
    fd.set("production_id", showId);
    fd.set("caption", caption);
    if (useFacebook) fd.set("facebook", "on");
    if (useInstagram) fd.set("instagram", "on");
    const res = await publishSocialPost(fd);
    setPending(false);
    setResult(res);
  }

  const canPublish =
    !pending &&
    Boolean(showId) &&
    Boolean(caption.trim()) &&
    Boolean(selected?.poster_url) &&
    (useFacebook || useInstagram);

  return (
    <div className={styles.form}>
      <label className={styles.label}>
        Show
        <select
          className={styles.input}
          value={showId}
          onChange={(e) => onShowChange(e.target.value)}
        >
          {shows.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </label>

      {selected && !selected.poster_url && (
        <p className={styles.inlineError}>
          This show has no poster image yet — add one on its edit page first.
        </p>
      )}

      {selected?.poster_url && (
        <div className={styles.posterPreview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selected.poster_url} alt="" />
        </div>
      )}

      <label className={styles.label}>
        Caption
        <textarea
          className={styles.textarea}
          rows={6}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
      </label>

      <div className={styles.row2}>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={useFacebook}
            disabled={!platforms.facebook}
            onChange={(e) => setUseFacebook(e.target.checked)}
          />
          Facebook{" "}
          {!platforms.facebook && (
            <span className={styles.hint}>(not configured)</span>
          )}
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={useInstagram}
            disabled={!platforms.instagram}
            onChange={(e) => setUseInstagram(e.target.checked)}
          />
          Instagram{" "}
          {!platforms.instagram && (
            <span className={styles.hint}>(not configured)</span>
          )}
        </label>
      </div>

      <button
        type="button"
        className={styles.btn}
        disabled={!canPublish}
        onClick={onPublish}
      >
        {pending ? "Publishing…" : "Publish"}
      </button>

      {result?.error && <p className={styles.inlineError}>{result.error}</p>}
      {result?.facebook &&
        (result.facebook.ok ? (
          <p className={styles.ok} style={{ marginBottom: 0 }}>
            Facebook: posted.
            {result.facebook.url && (
              <>
                {" "}
                <a href={result.facebook.url} target="_blank" rel="noopener">
                  View post ↗
                </a>
              </>
            )}
          </p>
        ) : (
          <p className={styles.inlineError}>Facebook: {result.facebook.error}</p>
        ))}
      {result?.instagram &&
        (result.instagram.ok ? (
          <p className={styles.ok} style={{ marginBottom: 0 }}>
            Instagram: posted.
          </p>
        ) : (
          <p className={styles.inlineError}>
            Instagram: {result.instagram.error}
          </p>
        ))}
    </div>
  );
}
