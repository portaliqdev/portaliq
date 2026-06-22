import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * App gate. When auth is configured (BETTER_AUTH_SECRET set), every page
 * requires a session cookie; otherwise redirect to sign-in. When auth isn't
 * configured, this is a pass-through so the app stays usable.
 *
 * Uses Better Auth's optimistic cookie check (edge-safe, fast). Full session
 * validation happens server-side; this just gates page access.
 *
 * Matcher excludes the /auth pages, the /api/auth endpoints, and static assets.
 */
const authEnabled = Boolean(process.env.BETTER_AUTH_SECRET);

export function middleware(req: NextRequest) {
  if (!authEnabled) return NextResponse.next();
  const sessionCookie = getSessionCookie(req);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/auth/sign-in", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!auth|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
