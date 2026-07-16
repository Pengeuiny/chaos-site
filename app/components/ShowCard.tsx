"use client";

import Link from "next/link";
import { useState } from "react";
import { characterizeShow } from "@/lib/format";
import type { ProductionWithDetails } from "@/lib/types";

export default function ShowCard({ p }: { p: ProductionWithDetails }) {
  const [err, setErr] = useState(false);
  const status = characterizeShow(p);
  const showImg = p.poster_url && !err;

  return (
    <Link className="show" href={`/shows/${p.slug}`}>
      <div className="poster">
        <span className={`tag ${status.tagClass}`}>{status.tagText}</span>
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.poster_url!}
            alt={`${p.title} poster`}
            loading="lazy"
            onError={() => setErr(true)}
          />
        ) : (
          <div
            className="ph"
            style={{
              background: `linear-gradient(150deg,${p.accent ?? "#173568"},#0c0307)`,
            }}
          >
            <div>
              <div
                className="anton"
                style={{ fontSize: 34, color: "rgba(246,239,226,.9)" }}
              >
                {p.title}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="body">
        <div className="type">{p.type}</div>
        <h3>{p.title}</h3>
        <div className="when">{status.dateLabel}</div>
        <div className="go">View show details →</div>
      </div>
    </Link>
  );
}
