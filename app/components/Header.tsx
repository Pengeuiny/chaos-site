"use client";

import Link from "next/link";
import { useState } from "react";
import { DUES } from "@/lib/links";

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
          <div>
            <b>CHS&nbsp;CHAOS</b>
            <small>Cuthbertson Booster Club</small>
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
            </Link>
          ))}
          <a href={DUES} target="_blank" rel="noopener" onClick={() => setOpen(false)}>
            Pay Dues
          </a>
        </nav>
        <div className="header-ctas">
          <a
            className="btn btn-ghost"
            href={DUES}
            target="_blank"
            rel="noopener"
          >
            Pay Dues
          </a>
          <Link className="btn btn-gold cta-glow" href="/#flexpass" onClick={() => setOpen(false)}>
            Get a Flex Pass
          </Link>
        </div>
      </div>
    </header>
  );
}
