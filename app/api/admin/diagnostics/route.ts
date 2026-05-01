import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Public connectivity check used by /admin/diagnostics. NEVER returns the
// actual key values — only their length, prefix, and "set or unset" status.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const cloudKey = process.env.CLOUDINARY_API_KEY;
  const cloudSecret = process.env.CLOUDINARY_API_SECRET;

  function describe(v: string | undefined): { set: boolean; len: number; head: string } {
    if (!v) return { set: false, len: 0, head: "" };
    return { set: true, len: v.length, head: v.slice(0, 12) + (v.length > 12 ? "…" : "") };
  }

  const supabaseConfig = {
    url: { set: !!url, value: url ?? null },
    anon: describe(anon),
    service: describe(service),
  };

  const cloudinaryConfig = {
    cloudName: { set: !!cloudName, value: cloudName ?? null },
    apiKey: describe(cloudKey),
    apiSecret: describe(cloudSecret),
  };

  // Live tests
  const tests: Record<string, { ok: boolean; status?: number; error?: string; data?: any }> = {};

  // Test 1: Supabase auth endpoint (uses publishable/anon)
  if (url && anon) {
    try {
      const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anon } });
      tests.supabaseAuth = {
        ok: r.ok,
        status: r.status,
        ...(r.ok ? {} : { error: await r.text().then((t) => t.slice(0, 200)) }),
      };
    } catch (e: any) {
      tests.supabaseAuth = { ok: false, error: e?.message || "fetch failed" };
    }
  } else {
    tests.supabaseAuth = { ok: false, error: "URL or publishable key missing" };
  }

  // Test 2: Service role can read REST root (lists table count)
  if (url && service) {
    try {
      const r = await fetch(`${url}/rest/v1/`, {
        headers: { apikey: service, Authorization: `Bearer ${service}` },
      });
      tests.supabaseServiceRole = {
        ok: r.ok,
        status: r.status,
        ...(r.ok ? {} : { error: await r.text().then((t) => t.slice(0, 200)) }),
      };
    } catch (e: any) {
      tests.supabaseServiceRole = { ok: false, error: e?.message || "fetch failed" };
    }
  } else {
    tests.supabaseServiceRole = { ok: false, error: "URL or secret key missing" };
  }

  // Test 3: Schema check — does the `products` table exist?
  if (url && service) {
    try {
      const supabase = createClient(url, service, { auth: { persistSession: false } });
      const { error, count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true });
      if (error) {
        tests.schemaProducts = { ok: false, error: error.message };
      } else {
        tests.schemaProducts = { ok: true, data: { rows: count ?? 0 } };
      }
    } catch (e: any) {
      tests.schemaProducts = { ok: false, error: e?.message || "connection failed" };
    }
  } else {
    tests.schemaProducts = { ok: false, error: "Service role not configured" };
  }

  // Test 4: Schema check — does the `admins` table exist + how many admins?
  if (url && service) {
    try {
      const supabase = createClient(url, service, { auth: { persistSession: false } });
      const { error, count } = await supabase
        .from("admins")
        .select("user_id", { count: "exact", head: true });
      if (error) {
        tests.schemaAdmins = { ok: false, error: error.message };
      } else {
        tests.schemaAdmins = { ok: true, data: { admins: count ?? 0 } };
      }
    } catch (e: any) {
      tests.schemaAdmins = { ok: false, error: e?.message || "connection failed" };
    }
  } else {
    tests.schemaAdmins = { ok: false, error: "Service role not configured" };
  }

  // Test 5: Cloudinary ping (just confirms cloud_name resolves)
  if (cloudName) {
    try {
      const r = await fetch(`https://res.cloudinary.com/${cloudName}/image/upload/sample`, { method: "HEAD" });
      // Cloudinary returns 200/302 for valid cloud_name, 404 for missing.
      tests.cloudinary = {
        ok: r.status !== 404,
        status: r.status,
      };
    } catch (e: any) {
      tests.cloudinary = { ok: false, error: e?.message || "fetch failed" };
    }
  } else {
    tests.cloudinary = { ok: false, error: "Cloud name not set" };
  }

  return NextResponse.json({
    config: { supabase: supabaseConfig, cloudinary: cloudinaryConfig },
    tests,
    timestamp: new Date().toISOString(),
  });
}
