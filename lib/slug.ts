// Convert a free-form name/title into a clean URL slug.
// "ChatGPT Plus Plan!" → "chatgpt-plus-plan"
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")        // strip diacritics
    .replace(/[^a-z0-9\s-]/g, "")           // drop everything except letters, digits, spaces, dashes
    .replace(/\s+/g, "-")                   // spaces → dashes
    .replace(/-+/g, "-")                    // collapse runs of dashes
    .replace(/^-|-$/g, "")                  // trim leading/trailing dashes
    .slice(0, 80);                          // hard cap
}

// Ensure the slug doesn't collide with an existing row. Probes the table by
// slug and appends -2, -3, … on conflicts. `excludeKey` lets us skip the
// row we're updating.
export async function ensureUniqueSlug(
  supabase: any,
  table: string,
  column: string,
  base: string,
  excludeKey?: string,
): Promise<string> {
  if (!base) base = "item";
  let candidate = base;
  let n = 1;
  // Cap at a sane limit so we never loop forever.
  while (n < 50) {
    let query = supabase.from(table).select(column, { head: true, count: "exact" }).eq(column, candidate);
    if (excludeKey) query = query.neq(column, excludeKey);
    const { count, error } = await query;
    if (error) throw error;
    if (!count) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
  // Extreme fallback: append a short random tail.
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}
