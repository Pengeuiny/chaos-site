"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The collapsible part of EventHero's info card: synopsis clamped to 4
 * lines with its own "Show more" toggle, performance dates always shown in
 * full (the main thing a visitor cares about), and audition/callback/tech
 * week/etc. dates tucked behind a separate "Audition & Prep Dates" toggle
 * since they're only relevant to students trying out, not ticket buyers.
 * Split out from EventHero (a server component) since expand/collapse
 * needs client state.
 */
export default function EventCardBody({
  tagline,
  synopsis,
  castNote,
  cast,
  chips,
  prepChips,
}: {
  tagline?: string | null;
  synopsis?: string | null;
  castNote?: ReactNode;
  cast?: ReactNode;
  chips: ReactNode[];
  prepChips?: ReactNode[];
}) {
  const [synExpanded, setSynExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const [showPrep, setShowPrep] = useState(false);
  const synRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = synRef.current;
    if (el) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [synopsis]);

  const hasPrepChips = (prepChips?.length ?? 0) > 0;

  return (
    <>
      {tagline && <p className="tagline">{tagline}</p>}
      {synopsis && (
        <p ref={synRef} className={`syn${synExpanded ? "" : " syn-clamp"}`}>
          {synopsis}
        </p>
      )}
      {clamped && (
        <button
          type="button"
          className="show-more"
          onClick={() => setSynExpanded((e) => !e)}
        >
          {synExpanded ? "Show less ↑" : "Show more ↓"}
        </button>
      )}

      {castNote}
      {cast}

      {chips.length > 0 && <div className="chips">{chips}</div>}

      {hasPrepChips && (
        <>
          <button
            type="button"
            className="show-more"
            onClick={() => setShowPrep((s) => !s)}
          >
            {showPrep ? "Hide Audition & Prep Dates ↑" : "Show Audition & Prep Dates ↓"}
          </button>
          {showPrep && <div className="chips">{prepChips}</div>}
        </>
      )}
    </>
  );
}
