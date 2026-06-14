import type { SupabaseClient } from "@supabase/supabase-js";

// Ported from lib/slug.ts.
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function ensureUniqueSlug(
  supabase: SupabaseClient,
  table: string,
  column: string,
  base: string,
  excludeKey?: string,
): Promise<string> {
  if (!base) base = "item";
  let candidate = base;
  let n = 1;
  while (n < 50) {
    let query = supabase.from(table).select(column, { head: true, count: "exact" }).eq(column, candidate);
    if (excludeKey) query = query.neq(column, excludeKey);
    const { count, error } = await query;
    if (error) throw error;
    if (!count) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}
