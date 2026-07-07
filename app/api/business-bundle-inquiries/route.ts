import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please complete the business inquiry form." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const name = text(input.name, 160);
  const email = text(input.email, 254).toLowerCase();
  const whatsapp = text(input.whatsapp, 80);
  const companyName = text(input.companyName, 180);
  const teamSize = text(input.teamSize, 80);
  const requiredTools = text(input.requiredTools, 1200);
  const message = text(input.message, 3000);

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  if (!whatsapp) return NextResponse.json({ error: "WhatsApp number is required." }, { status: 400 });
  if (!companyName) return NextResponse.json({ error: "Company name is required." }, { status: 400 });
  if (!teamSize) return NextResponse.json({ error: "Team size is required." }, { status: 400 });
  if (!requiredTools) return NextResponse.json({ error: "Required tools are required." }, { status: 400 });
  if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });

  try {
    const { error } = await getSupabaseAdmin().from("business_bundle_inquiries").insert({
      name,
      email,
      whatsapp,
      company_name: companyName,
      team_size: teamSize,
      required_tools: requiredTools,
      message,
      status: "new",
    });

    if (error) {
      return NextResponse.json({ error: "Could not save the inquiry. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not save the inquiry. Please try again." }, { status: 500 });
  }
}
