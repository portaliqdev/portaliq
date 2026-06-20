import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

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
    <html lang="en" data-theme="dark">
      <body>
        <Providers>
          <div className="flex h-screen overflow-hidden bg-canvas text-ink">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar />
              <main className="min-h-0 flex-1 overflow-y-auto bg-base">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
