import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("pricing_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ plans: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ plans: data || [] });
  } catch {
    return NextResponse.json({ plans: [], error: "Could not load pricing plans." }, { status: 500 });
  }
}
