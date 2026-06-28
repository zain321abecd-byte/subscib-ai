import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveAdminAccess } from "@/lib/admin-access";
import { requiredPermissionForPath, hasPermission } from "@/lib/permissions";

// Gate /admin/** behind a Supabase session + a back-office role (resolved from
// the new public.users role model). Customers are rejected even with a valid
// session. /admin/login is allowed through unauthenticated.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always expose the pathname to layouts/pages via a request header so the
  // root layout can decide whether to render the public chrome.
  const fwdHeaders = new Headers(req.headers);
  fwdHeaders.set("x-pathname", pathname);

  // Vercel auto-injects `x-vercel-ip-country` (ISO 3166-1 alpha-2). Forward it
  // explicitly under a stable header name so layouts/getRegion() don't depend
  // on the Vercel-specific name. In local dev this is empty — falls back to
  // OTHER until the user picks a currency manually.
  const country = req.headers.get("x-vercel-ip-country") || "";
  fwdHeaders.set("x-user-country", country);

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next({ request: { headers: fwdHeaders } });
  }
  if (pathname === "/admin/login" || pathname === "/admin/diagnostics") {
    return NextResponse.next({ request: { headers: fwdHeaders } });
  }

  // If Supabase isn't configured yet, send the user to the login page where
  // we can show a friendly setup message instead of crashing the middleware.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    redirectUrl.searchParams.set("error", "not_configured");
    return NextResponse.redirect(redirectUrl);
  }

  const res = NextResponse.next();

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Resolve the caller's back-office role from the new public.users model
  // (falls back to the legacy admins table). Customers / unknown users get
  // null and are bounced. The admin layout re-checks this server-side, so this
  // is the first of two gates, not the only one.
  const access = await resolveAdminAccess(user.email ?? null, user.id);
  if (!access) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("error", "not_admin");
    return NextResponse.redirect(url);
  }

  // Section-level permission check (e.g. an editor cannot open /admin/orders).
  const needed = requiredPermissionForPath(pathname);
  if (needed && !hasPermission(access.effectivePermissions, needed)) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    url.searchParams.set("denied", needed);
    return NextResponse.redirect(url);
  }

  // Carry through the pathname header on the authed admin response too.
  res.headers.set("x-pathname", pathname);
  return res;
}

// Match every route except static assets so we always set x-pathname.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|assets/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2|ttf|otf)$).*)",
  ],
};
