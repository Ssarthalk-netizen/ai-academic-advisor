import type { Metadata, Viewport } from "next";
import "@fontsource/young-serif/400.css";
import "@fontsource-variable/instrument-sans";
import "./globals.css";

// Fonts are bundled from npm (self-hosted, no request to Google Fonts).
export const metadata: Metadata = {
  title: { default: "AI Academic Advisor", template: "%s · AI Academic Advisor" },
  description:
    "Know where you stand, what's going wrong and what to do next: risk radar, CGPA simulator, adaptive study planner and an AI advisor grounded in your own records.",
};

export const viewport: Viewport = { themeColor: "#fff6d9" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
