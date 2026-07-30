"use client";

import Link from "next/link";
import { useState } from "react";
import { PASSES, DUES } from "@/lib/links";
import ChangeBadge from "@/app/components/ChangeBadge";

const NAV = [
  { href: "/#home", label: "Home" },
  { href: "/#season", label: "Season" },
  { href: "/#calendar", label: "Calendar" },
  { href: "/#calendar", label: "Event Tickets" },
  { href: "/#theatre", label: "Theatre & ITS" },
  { href: "/#chorus", label: "Chorus" },
  { href: "/#mission", label: "About" },
  { href: "/#volunteer", label: "Volunteer" },
  { href: "/#contact", label: "Contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bar">
      <div className="row">
        <Link className="brand" href="/" onClick={() => setOpen(false)}>
          <div className="mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/chaos-logo.png" alt="CHS CHAOS" width={48} height={48} />
          </div>
          <div>
            <b>CHS&nbsp;CHAOS</b>
            <small>
              Cuthbertson Booster Club
              <ChangeBadge note={'President feedback: rename "Cuthbertson Boosters" to "Cuthbertson Booster Club".'} />
            </small>
          </div>
        </Link>
        <button
          className="navtoggle"
          aria-label="Toggle navigation"
          onClick={() => setOpen((o) => !o)}
        >
          ☰
        </button>
        <nav className={`links${open ? " open" : ""}`}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)}>
              {n.label}
              {n.label === "Chorus" && (
                <ChangeBadge note='President feedback: add a "Chorus" top nav link so Theatre, ITS, and Chorus are all covered.' />
              )}
            </Link>
          ))}
          <a href={DUES} target="_blank" rel="noopener" onClick={() => setOpen(false)}>
            Pay Dues
          </a>
        </nav>
        <div className="header-ctas">
          <span style={{ position: "relative", display: "inline-block" }}>
            <a
              className="btn btn-ghost"
              href={DUES}
              target="_blank"
              rel="noopener"
            >
              Pay Dues
            </a>
            <ChangeBadge
              variant="corner"
              note="President feedback: add a spot near the top for parents to easily pay dues."
            />
          </span>
          <a
            className="btn btn-gold cta-glow"
            href={PASSES}
            target="_blank"
            rel="noopener"
          >
            Get a Flex Pass
          </a>
        </div>
      </div>
    </header>
  );
}
