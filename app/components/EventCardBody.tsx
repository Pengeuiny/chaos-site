"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const MAX_CHIPS = 4;

/**
 * The collapsible part of EventHero's info card: synopsis clamped to 4
 * lines, performance chips capped at 4, with a single "Show more" toggle
 * that reveals both in full. Split out from EventHero (a server component)
 * since expand/collapse needs client state.
 */
export default function EventCardBody({
  tagline,
  synopsis,
  castNote,
  cast,
  chips,
}: {
  tagline?: string | null;
  synopsis?: string | null;
  castNote?: ReactNode;
  cast?: ReactNode;
  chips: ReactNode[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const synRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = synRef.current;
    if (el) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [synopsis]);

  const hasMoreChips = chips.length > MAX_CHIPS;
  const visibleChips = expanded ? chips : chips.slice(0, MAX_CHIPS);
  const showToggle = clamped || hasMoreChips;

  return (
    <>
      {tagline && <p className="tagline">{tagline}</p>}
      {synopsis && (
        <p ref={synRef} className={`syn${expanded ? "" : " syn-clamp"}`}>
          {synopsis}
        </p>
      )}

      {castNote}
      {cast}

      {chips.length > 0 && <div className="chips">{visibleChips}</div>}

      {showToggle && (
        <button
          type="button"
          className="show-more"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Show less ↑" : "Show more ↓"}
        </button>
      )}
    </>
  );
}
