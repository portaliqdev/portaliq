import { Providers } from "../providers";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

/** App shell — wraps the authenticated product pages. The /auth/* routes render
 * under the bare root layout (no sidebar/nav). */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex h-screen overflow-hidden bg-canvas text-ink">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="min-h-0 flex-1 overflow-y-auto bg-base">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
