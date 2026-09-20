import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isEmail, isPlausiblePhone, planLabel, type ProductFormRow } from "@/lib/product-forms";

export const dynamic = "force-dynamic";

/** Same submission shape as the other public form endpoints in this app. */
function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

/** Reject a repeat submission of the same number to the same form. */
const DUPLICATE_WINDOW_MINUTES = 2;

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please complete the form." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const name = text(input.name, 160);
  const phone = text(input.phone, 40);
  const email = text(input.email, 254).toLowerCase();
  const honeypot = text(input.company, 200);

  // A bot filled the hidden field. Answer like a success so it doesn't retry,
  // but write nothing.
  if (honeypot) return NextResponse.json({ ok: true });

  if (!name) return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  if (!isPlausiblePhone(phone)) return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
  if (!isEmail(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });

  const supabase = getSupabaseAdmin();

  // The product, plan and price come from the database — never from the
  // payload. Nothing the browser sends can change what is recorded.
  const { data: formRow, error: formError } = await supabase
    .from("product_forms")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (formError) {
    return NextResponse.json({ error: "Could not submit the request. Please try again." }, { status: 500 });
  }
  if (!formRow) {
    return NextResponse.json({ error: "This form is no longer available." }, { status: 404 });
  }
  const form = formRow as ProductFormRow;

  // Double-submit guard: same phone, same form, moments apart.
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MINUTES * 60_000).toISOString();
  const { data: recent } = await supabase
    .from("sale_requests")
    .select("request_no")
    .eq("form_id", form.id)
    .eq("customer_phone", phone)
    .gte("created_at", since)
    .limit(1);

  if (recent && recent.length > 0) {
    // Not an error from the customer's point of view — their request is in.
    return NextResponse.json({ ok: true, requestNo: recent[0].request_no ?? null, duplicate: true });
  }

  const { data, error } = await supabase
    .from("sale_requests")
    .insert({
      form_id: form.id,
      form_name: form.name,
      product_id: form.product_id,
      product_name: form.product_name,
      plan_duration: form.plan_duration,
      plan_label: planLabel(form.plan_duration, form.renewal_note),
      price: form.price,
      currency: form.currency,
      customer_name: name,
      customer_phone: phone,
      customer_email: email,
      status: "pending",
    })
    .select("request_no")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not submit the request. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, requestNo: data?.request_no ?? null });
}
