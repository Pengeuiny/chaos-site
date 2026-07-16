// External box-office links (Ludus). Centralized so every CTA stays in sync.
export const TICKETS =
  "https://cuthbertsontheatre.ludus.com/index.php?sections=events";
export const DUES =
  "https://cuthbertsontheatre.ludus.com/index.php?sections=payments";
export const PASSES = "https://cuthbertsontheatre.ludus.com/passes.php";

// Membership tiers, ported from the Ludus passes page so we can present them
// in our own skin instead of sending members straight off-site. Each still
// checks out on Ludus via its own flex.php link.
export const MEMBERSHIP_TIERS = [
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
