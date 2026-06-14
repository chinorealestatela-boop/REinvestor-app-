import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DealRadar — AI Real Estate Investment Platform",
  description:
    "AI-driven acquisition platform that finds undervalued residential properties before other investors.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
