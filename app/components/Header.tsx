"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  // Next's <Link> does nothing when the URL already ends in the same hash
  // (tap "Season", scroll away, tap "Season" again — or "Calendar" then
  // "Event Tickets", which share #calendar), so the menu looked broken on
  // mobile. When the target section is on the current page, scroll to it
  // ourselves.
  function goTo(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    setOpen(false);
    const [path, hash] = href.split("#");
    if (!hash || pathname !== (path || "/")) return;
    const el = document.getElementById(hash);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView();
    if (location.hash !== `#${hash}`) history.pushState(null, "", `#${hash}`);
  }

  return (
    <header className="bar">
      <div className="row">
        <Link className="brand" href="/" onClick={(e) => goTo(e, "/#home")}>
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
            <Link key={n.label} href={n.href} onClick={(e) => goTo(e, n.href)}>
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
          <Link className="btn btn-gold cta-glow" href="/#flexpass" onClick={(e) => goTo(e, "/#flexpass")}>
            Get a Flex Pass
          </Link>
        </div>
      </div>
    </header>
  );
}
