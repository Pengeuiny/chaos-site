import { Josefin_Sans, Limelight, Poiret_One } from "next/font/google";

// Art Deco set shared by /play and /gatsby. Self-hosted at build time.
export const limelight = Limelight({ subsets: ["latin"], weight: "400", variable: "--font-deco", display: "swap" });
export const poiret = Poiret_One({ subsets: ["latin"], weight: "400", variable: "--font-poiret", display: "swap" });
export const josefin = Josefin_Sans({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-josefin", display: "swap" });
export const decoFonts = `${limelight.variable} ${poiret.variable} ${josefin.variable}`;
