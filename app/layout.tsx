import type { Metadata } from "next";
import { Anton, Fraunces, Inter, Space_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
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
      className={`${inter.variable} ${fraunces.variable} ${anton.variable} ${spaceMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
