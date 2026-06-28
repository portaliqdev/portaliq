import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PortalIQ — Transfer Portal Intelligence",
  description:
    "The recruiting war room for college football. AI-graded transfer-portal intelligence, fit scoring, and roster strategy — built for Power 4 programs.",
  metadataBase: new URL("https://portaliq.app"),
  openGraph: {
    title: "PortalIQ — Transfer Portal Intelligence",
    description:
      "AI-graded transfer-portal intelligence, fit scoring, and roster strategy for college football.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#08090c",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
