import { getSupabaseServer } from "@/lib/supabase/server";
import type { SiteSettingRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

export async function loadSettings(): Promise<Record<string, string>> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase.from("site_settings").select("*");
  const rows = (data ?? []) as SiteSettingRow[];
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = asString(r.value);
  return out;
}
