import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

export async function loadSettings(): Promise<Record<string, string>> {
  return getSiteSettings();
}
