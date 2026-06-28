import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Routing gate.
 *  - `/` is the public marketing landing. Authed visitors are forwarded to `/app`.
 *  - `/app/*` is the product and requires a session (when auth is configured); signed-out
 *    visitors are redirected to sign-in.
 *  - `/auth/*`, `/api/auth/*`, and static assets are always public.
 *
 * Uses Better Auth's optimistic cookie check (edge-safe). Full session validation
 * happens server-side; this only gates page access. When auth isn't configured
 * (no BETTER_AUTH_SECRET) the app stays fully usable for local/demo work.
 */
const authEnabled = Boolean(process.env.BETTER_AUTH_SECRET);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = authEnabled ? Boolean(getSessionCookie(req)) : true;

  // Landing → send authenticated users straight into the war room.
  if (pathname === "/") {
    if (hasSession && authEnabled) {
      return NextResponse.redirect(new URL("/app", req.url));
    }
    return NextResponse.next();
  }

  // Product is gated.
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    if (!hasSession) {
      return NextResponse.redirect(new URL("/auth/sign-in", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!auth|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
