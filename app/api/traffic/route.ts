import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TrafficBody = {
  event_type?: "pageview" | "heartbeat";
  session_id?: string;
  page_url?: string;
  page_path?: string;
  referrer?: string | null;
  landing_page?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  user_email?: string | null;
};

function cleanStr(value: unknown, max = 500) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function parseUserAgent(ua: string) {
  const lower = ua.toLowerCase();
  const isMobile = /iphone|android|mobile|ipod/.test(lower);
  const isTablet = /ipad|tablet/.test(lower);
  const device_type = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  const os =
    /windows/.test(lower) ? "Windows" :
    /iphone|ipad|ipod/.test(lower) ? "iOS" :
    /android/.test(lower) ? "Android" :
    /mac os|macintosh/.test(lower) ? "macOS" :
    /linux/.test(lower) ? "Linux" :
    "Other";

  const browser =
    /edg\//.test(lower) ? "Edge" :
    /opr\//.test(lower) || /opera/.test(lower) ? "Opera" :
    /chrome|crios/.test(lower) ? "Chrome" :
    /firefox|fxios/.test(lower) ? "Firefox" :
    /safari/.test(lower) ? "Safari" :
    "Other";

  return { browser, os, device_type, platform: `${device_type} / ${os}` };
}

function sourceFrom(input: { utm_source?: string | null; referrer?: string | null }) {
  const raw = cleanStr(input.utm_source, 80)?.toLowerCase();
  if (raw) return normalizeSource(raw);

  const referrer = cleanStr(input.referrer, 500);
  if (!referrer) return "direct";

  try {
    return normalizeSource(new URL(referrer).hostname.replace(/^www\./, ""));
  } catch {
    return "referral";
  }
}

function normalizeSource(value: string) {
  if (/google|gclid/.test(value)) return "google";
  if (/instagram|insta|ig/.test(value)) return "instagram";
  if (/facebook|fb\.|fb$|meta/.test(value)) return "facebook";
  if (/tiktok/.test(value)) return "tiktok";
  if (/youtube|youtu\.be/.test(value)) return "youtube";
  if (/twitter|x\.com/.test(value)) return "x";
  if (/linkedin/.test(value)) return "linkedin";
  if (/whatsapp|wa\.me/.test(value)) return "whatsapp";
  return value || "direct";
}

export async function POST(req: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: true, stored: false, reason: "supabase_not_configured" });
  }

  let body: TrafficBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = cleanStr(body.session_id, 120);
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "Missing session_id" }, { status: 400 });
  }

  const ua = req.headers.get("user-agent") || "";
  const parsed = parseUserAgent(ua);
  const now = new Date().toISOString();

  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const ssr = await getSupabaseServer();
    const { data: { user } } = await ssr.auth.getUser();
    if (user) {
      userId = user.id;
      userEmail = user.email?.toLowerCase() ?? userEmail;
    }
  } catch {
    // Anonymous visitor.
  }

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("traffic_sessions")
    .select("session_id, pageviews, landing_page, referrer, utm_source, utm_medium, utm_campaign")
    .eq("session_id", sessionId)
    .maybeSingle();

  const eventType = body.event_type === "heartbeat" ? "heartbeat" : "pageview";
  const utm_source = cleanStr(body.utm_source, 120) ?? existing?.utm_source ?? null;
  const referrer = cleanStr(body.referrer, 500) ?? existing?.referrer ?? null;
  const update = {
    session_id: sessionId,
    last_seen: now,
    updated_at: now,
    pageviews: Number(existing?.pageviews ?? 0) + (eventType === "pageview" ? 1 : 0),
    user_id: userId,
    user_email: userEmail,
    last_page: cleanStr(body.page_url, 500),
    landing_page: cleanStr(body.landing_page, 500) ?? existing?.landing_page ?? cleanStr(body.page_url, 500),
    referrer,
    utm_source,
    utm_medium: cleanStr(body.utm_medium, 120) ?? existing?.utm_medium ?? null,
    utm_campaign: cleanStr(body.utm_campaign, 160) ?? existing?.utm_campaign ?? null,
    source: sourceFrom({ utm_source, referrer }),
    user_agent: ua.slice(0, 500),
    ...parsed,
  };

  const { error } = await supabase.from("traffic_sessions").upsert(update, { onConflict: "session_id" });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, stored: true });
}
