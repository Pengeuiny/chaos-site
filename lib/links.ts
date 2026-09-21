// CHAOS social profiles. The Facebook page has no vanity name, so it's linked
// by its numeric page ID — a plain path that redirects to the page and, unlike
// the legacy profile.php?id= form, behaves the same in Facebook's in-app
// browser. The Ludus box office is configured with the same two handles, so
// both sites point at the same places.
export const FACEBOOK = "https://www.facebook.com/61553584894959";
export const INSTAGRAM = "https://www.instagram.com/chs_chaos/";

// External box-office links (Ludus). Centralized so every CTA stays in sync.
export const TICKETS =
  "https://cuthbertsontheatre.ludus.com/index.php?sections=events";
export const DUES =
  "https://cuthbertsontheatre.ludus.com/index.php?sections=payments";
export const PASSES = "https://cuthbertsontheatre.ludus.com/passes.php";

// CHAOS 26-27 Flex Pass tiers (formerly "Membership"), ported from the
// Ludus passes page so we can present them in our own skin instead of
// sending people straight off-site. Each still checks out on Ludus via its
// own flex.php link. Ludus now auto-tracks each tier's complimentary
// tickets and usage, and every 26-27 Flex Pass includes a 10% discount on
// event tickets — see the passes page for the source of truth.
export const FLEX_PASS_TIERS = [
  {
    name: "Tier 1",
    price: 30,
    benefits: ["10% off CHAOS ticket sales", "CHAOS magnet"],
    url: "https://cuthbertsontheatre.ludus.com/flex.php?id=7385",
  },
  {
    name: "Tier 2",
    price: 60,
    benefits: [
      "10% off CHAOS ticket sales",
      "CHAOS magnet",
      "2 CHAOS seat cushions",
      "2 CHAOS tickets ($30 value)",
    ],
    url: "https://cuthbertsontheatre.ludus.com/flex.php?id=7386",
  },
  {
    name: "Tier 3",
    price: 100,
    benefits: [
      "10% off CHAOS ticket sales",
      "CHAOS magnet",
      "2 CHAOS seat cushions",
      "4 CHAOS tickets ($60 value)",
      "Recognition in the playbills",
    ],
    url: "https://cuthbertsontheatre.ludus.com/flex.php?id=7387",
  },
] as const;
