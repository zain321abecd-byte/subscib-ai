import { getSupabaseAdmin, hasServiceRole } from "@/lib/supabase/admin";

/**
 * Order statuses that represent a real completed sale. `pending` and `failed`
 * never happened; `refunded` / `cancelled` were undone. The admin dashboard
 * treats `paid` the same way for revenue.
 */
const SOLD_STATUSES = ["paid", "delivered"] as const;

/**
 * Truthful units-sold count for one product, for the "Sold N" stat on the
 * product page.
 *
 * Reads via the service-role client on purpose: RLS on `orders` restricts
 * SELECT to admins and to a user's own rows, and under RLS a filtered count
 * silently returns 0 for anonymous visitors rather than erroring — which would
 * quietly render a wrong number instead of no number.
 *
 * Returns null (not 0) when the count can't be established, so callers can
 * hide the stat rather than claim zero sales.
 *
 * Known undercount: bundle purchases record their contents as tool *names*
 * under `variation.bundle.selectedTools`, not as product ids, so a bundle that
 * included this product is not counted here. Better to under-report than to
 * guess by name-matching.
 */
export async function getUnitsSold(productId: string): Promise<number | null> {
  if (!productId || !hasServiceRole()) return null;

  try {
    const supabase = getSupabaseAdmin();
    // Push the JSONB containment down to Postgres so we only pull rows that
    // actually mention this product, then sum qty per line item.
    const { data, error } = await supabase
      .from("orders")
      .select("items")
      .in("status", SOLD_STATUSES as unknown as string[])
      .contains("items", [{ id: productId }]);

    if (error || !Array.isArray(data)) return null;

    let units = 0;
    for (const row of data) {
      const items: unknown = (row as { items?: unknown }).items;
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const line = item as { id?: unknown; qty?: unknown };
        if (line.id !== productId) continue;
        const qty = Number(line.qty);
        units += Number.isFinite(qty) && qty > 0 ? qty : 1;
      }
    }
    return units;
  } catch {
    return null;
  }
}

/** "Sold 3.04M" style compact formatting, matching the marketplace convention. */
export function formatSoldCount(units: number): string {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: units >= 1000 ? 2 : 0,
  }).format(units);
}
