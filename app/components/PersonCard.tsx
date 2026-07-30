"use client";

import { useState } from "react";
import { initials } from "@/lib/format";
import type { Person } from "@/lib/types";
import ChangeBadge from "@/app/components/ChangeBadge";

export default function PersonCard({ p, badge }: { p: Person; badge?: string }) {
  const [err, setErr] = useState(false);
  const showImg = p.image_url && !err;
  return (
    <div className="person">
      {badge && <ChangeBadge variant="corner" note={badge} />}
      <div className="ph">
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.image_url!}
            alt={p.name}
            loading="lazy"
            onError={() => setErr(true)}
          />
        ) : (
          <div className="ini">{initials(p.name)}</div>
        )}
      </div>
      <div className="meta">
        <div className="role">{p.role}</div>
        <div className="nm">{p.name}</div>
        {p.email && (
          <a className="em" href={`mailto:${p.email}`}>
            {p.email}
          </a>
        )}
      </div>
    </div>
  );
}
