"use client";

import { useState } from "react";
import { characterizeShow } from "@/lib/format";
import type { ProductionWithDetails } from "@/lib/types";
import ShowCard from "@/app/components/ShowCard";

/**
 * "This Season's Shows" heading + grid. Past shows are hidden by default
 * (they're no longer actionable — no tickets to buy) but stay one click
 * away via the filter chip rather than disappearing outright.
 */
export default function SeasonGrid({ productions }: { productions: ProductionWithDetails[] }) {
  const [showPast, setShowPast] = useState(false);

  const withStatus = productions.map((p) => ({
    p,
    isPast: characterizeShow(p).tagClass === "past",
  }));
  const anyPast = withStatus.some((x) => x.isPast);
  const visible = withStatus.filter((x) => showPast || !x.isPast);

  return (
    <>
      <div className="sec-head">
        <div>
          <div className="k">The Lineup</div>
          <h2>
            This Season&rsquo;s <span className="gold">Shows</span>
          </h2>
        </div>
        {anyPast && (
          <button
            type="button"
            className={`chip-filter${showPast ? " active" : ""}`}
            onClick={() => setShowPast((s) => !s)}
          >
            {showPast ? "Hide Past Shows" : "Reveal Past Shows"}
          </button>
        )}
      </div>
      <div className="season">
        {visible.map(({ p }) => (
          <ShowCard key={p.id} p={p} />
        ))}
      </div>
    </>
  );
}
