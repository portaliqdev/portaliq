import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PortalIQ — Moneyball for Maryland",
  description:
    "AI-powered NCAA D1 College Football transfer-portal intelligence platform.",
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
