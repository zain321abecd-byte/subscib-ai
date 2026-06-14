import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

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
    /linux/.test(lower) ? "Linux" : "Other";
  const browser =
    /edg\//.test(lower) ? "Edge" :
    /opr\//.test(lower) || /opera/.test(lower) ? "Opera" :
    /chrome|crios/.test(lower) ? "Chrome" :
    /firefox|fxios/.test(lower) ? "Firefox" :
    /safari/.test(lower) ? "Safari" : "Other";
  return { browser, os, device_type, platform: `${device_type} / ${os}` };
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

@Injectable()
export class TrafficService {
  constructor(private readonly supabase: SupabaseService) {}

  async capture(body: TrafficBody, userAgent: string, accessToken?: string) {
    const sessionId = cleanStr(body.session_id, 120);
    if (!sessionId) throw new BadRequestException("Missing session_id");

    const parsed = parseUserAgent(userAgent || "");
    const now = new Date().toISOString();

    const user = await this.supabase.getUser(accessToken);
    const userId = user?.id ?? null;
    const userEmail = user?.email?.toLowerCase() ?? null;

    const supabase = this.supabase.admin();
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
      user_agent: (userAgent || "").slice(0, 500),
      ...parsed,
    };

    const { error } = await supabase.from("traffic_sessions").upsert(update, { onConflict: "session_id" });
    if (error) throw new InternalServerErrorException(error.message);
    return { ok: true, stored: true };
  }
}
