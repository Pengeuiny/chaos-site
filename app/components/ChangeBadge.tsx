"use client";

/**
 * Marks a spot on the site that changed per the president's website
 * feedback doc, so it's easy to visually confirm each request landed.
 * `variant="inline"` sits right next to changed text; `variant="corner"`
 * pins to the top-right of a UI component (that component's wrapper must
 * be `position: relative`, matching the pattern most cards already use).
 * Hover or focus shows the original request as a tooltip. Remove once
 * the review pass is done — this isn't meant to be permanent UI.
 */
export default function ChangeBadge({
  note,
  variant = "inline",
}: {
  note: string;
  variant?: "inline" | "corner";
}) {
  return (
    <span
      className={`change-badge change-badge-${variant}`}
      tabIndex={0}
      aria-label={`Changed per feedback: ${note}`}
    >
      <span className="change-badge-mark" aria-hidden="true" />
      <span className="change-badge-tip" role="tooltip">
        {note}
      </span>
    </span>
  );
}
