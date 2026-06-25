"use client";

import Link from "next/link";
import { useState } from "react";
import { PASSES } from "@/lib/links";

const NAV = [
  { href: "/#home", label: "Home" },
  { href: "/#season", label: "Season" },
  { href: "/#calendar", label: "Calendar" },
  { href: "/#tickets", label: "Tickets & Dues" },
  { href: "/#theatre", label: "Theatre & ITS" },
  { href: "/#chorus", label: "Chorus" },
  { href: "/#board", label: "The Board" },
  { href: "/#volunteer", label: "Volunteer" },
  { href: "/#contact", label: "Contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bar">
      <div className="wrap row">
        <Link className="brand" href="/" onClick={() => setOpen(false)}>
          <div className="mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cuthbertson-mark.png" alt="Cuthbertson" />
          </div>
          <div>
            <b>CHS&nbsp;CHAOS</b>
            <small>Cuthbertson Boosters</small>
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
        </nav>
        <a
          className="btn btn-gold"
          href={PASSES}
          target="_blank"
          rel="noopener"
        >
          Become a Member
        </a>
      </div>
    </header>
  );
}
