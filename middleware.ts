import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Gate /admin/** behind a Supabase session + admins-table membership.
// /admin/login is allowed through unauthenticated.
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

  // Confirm user is in admins table. RLS would block their queries anyway,
  // but a redirect produces a friendlier UX.
  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("error", "not_admin");
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
