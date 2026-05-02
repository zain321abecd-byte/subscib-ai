import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getRegion } from "@/lib/region";

export const dynamic = "force-dynamic";

// Public endpoint — returns ONLY what's needed to diagnose region detection.
// No secrets, no PII beyond geo IP info Vercel already exposes.
export async function GET() {
  const h = await headers();

  const interesting = [
    "x-vercel-ip-country",
    "x-vercel-ip-country-region",
    "x-vercel-ip-city",
    "x-vercel-ip-latitude",
    "x-vercel-ip-longitude",
    "x-vercel-ip-timezone",
    "x-user-country",
    "x-pathname",
    "accept-language",
    "user-agent",
  ];

  const detected: Record<string, string> = {};
  for (const k of interesting) {
    const v = h.get(k);
    if (v) detected[k] = k === "user-agent" ? v.slice(0, 80) + "…" : v;
  }

  const region = await getRegion();

  return NextResponse.json({
    region,                                  // "PK" | "OTHER"
    interpretation: region === "PK"
      ? "Visitor is treated as Pakistani — local payment methods + PKR-first copy."
      : "Visitor is treated as international — Card-only + USD-first copy.",
    detected,                                // raw headers we read
    note: "If x-vercel-ip-country is empty even though you're on Vercel, geolocation may not be enabled for this deployment. Check Vercel project settings.",
  });
}
