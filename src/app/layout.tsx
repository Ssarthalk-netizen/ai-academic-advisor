import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

// Fonts are bundled from npm (no request to Google Fonts at runtime).
export const metadata: Metadata = {
  title: "AI Academic Advisor",
  description: "Personalized academic guidance: risk radar, CGPA simulator, adaptive study planner and an AI advisor grounded in your own records.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
