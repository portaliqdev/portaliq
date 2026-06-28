import { Providers } from "../providers";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { CommandPalette } from "@/components/ui/CommandPalette";

/** App shell — wraps the authenticated product pages. The /auth/* routes and the
 * public marketing landing render under the bare root layout (no sidebar/nav). */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex h-[100dvh] overflow-hidden bg-canvas text-ink">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="min-h-0 flex-1 overflow-y-auto bg-base">{children}</main>
        </div>
      </div>
      <CommandPalette />
    </Providers>
  );
}
