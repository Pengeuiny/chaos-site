import type { Metadata } from "next";
import { Anton, Fraunces, Inter, Space_Mono } from "next/font/google";
import "./globals.css";

// Self-hosted at build time (no runtime request to fonts.googleapis.com/
// fonts.gstatic.com), which removes two render-blocking round trips from
// first load.
const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-fraunces",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CHS CHAOS — Cuthbertson High School Theatre & Chorus Boosters",
  description:
    "CHS CHAOS supports the theatre and choral programs at Cuthbertson High School in Waxhaw, NC. Tickets, events, volunteering, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${fraunces.variable} ${inter.variable} ${spaceMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
