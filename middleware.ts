import { NextResponse, type NextRequest } from "next/server";

/**
 * Gate /admin/** behind the portal JWT cookie.
 *
 * The middleware only checks *presence* — the real validation (signature,
 * expiry, permissions) happens server-side in the /admin layout via
 * getAdminContext() calling the backend /portal/me. That two-tier setup is
 * intentional: the middleware runs on the Edge (no Node crypto), and it's
 * enough here to bounce anonymous visitors early. Every mutating server
 * action re-validates before touching data.
 */
const PORTAL_COOKIE = "subscribai-portal-token";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always expose the pathname + geo hint to layouts.
  const fwdHeaders = new Headers(req.headers);
  fwdHeaders.set("x-pathname", pathname);
  fwdHeaders.set("x-user-country", req.headers.get("x-vercel-ip-country") || "");

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next({ request: { headers: fwdHeaders } });
  }
  // Public entry points into the portal don't require a token.
  if (
    pathname === "/admin/login" ||
    pathname === "/admin/accept-invite" ||
    pathname === "/admin/diagnostics"
  ) {
    return NextResponse.next({ request: { headers: fwdHeaders } });
  }

  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    if (pathname !== "/admin") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request: { headers: fwdHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|assets/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2|ttf|otf)$).*)",
  ],
};
