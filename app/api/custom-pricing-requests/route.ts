import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BILLING_CYCLES = new Set(["monthly", "yearly"]);

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please complete the custom pricing request form." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const fullName = cleanText(input.fullName, 180);
  const email = cleanText(input.email, 254).toLowerCase();
  const whatsapp = cleanText(input.whatsapp, 80);
  const companyName = cleanText(input.companyName, 180) || null;
  const teamSize = cleanText(input.teamSize, 80) || null;
  const requiredTools = cleanText(input.requiredTools, 1200);
  const billingCycle = cleanText(input.billingCycle, 20).toLowerCase() || "monthly";
  const budget = cleanText(input.budget, 120) || null;
  const message = cleanText(input.message, 5000);

  if (!fullName) return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  if (!whatsapp) return NextResponse.json({ error: "WhatsApp number is required." }, { status: 400 });
  if (!requiredTools) return NextResponse.json({ error: "Required tools are required." }, { status: 400 });
  if (!BILLING_CYCLES.has(billingCycle)) return NextResponse.json({ error: "Please choose monthly or yearly." }, { status: 400 });
  if (!message) return NextResponse.json({ error: "Message / requirements are required." }, { status: 400 });

  try {
    const { error } = await getSupabaseAdmin()
      .from("custom_pricing_requests")
      .insert({
        full_name: fullName,
        email,
        whatsapp,
        company_name: companyName,
        team_size: teamSize,
        required_tools: requiredTools,
        billing_cycle: billingCycle,
        budget,
        message,
        status: "new",
      });

    if (error) {
      return NextResponse.json({ error: "Could not submit your request. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not submit your request. Please try again." }, { status: 500 });
  }
}
