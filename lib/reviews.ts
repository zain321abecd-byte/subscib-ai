import { getSupabaseServer } from "@/lib/supabase/server";
import type { ReviewRow } from "@/lib/supabase/types";

export type Review = {
  name: string;
  initials: string;
  role: string;
  city: string;
  product?: string;
  text: string;
  color: string;
};

const COLOR_FALLBACK = "var(--brand-soft)";

function rowToReview(row: ReviewRow): Review {
  return {
    name: row.name,
    initials: row.initials || row.name.slice(0, 2).toUpperCase(),
    role: "",
    city: "",
    product: row.product_name ?? undefined,
    text: row.text,
    color: row.color || COLOR_FALLBACK,
  };
}

export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Fetch admin-curated reviews from Supabase. Empty array if DB unset / no rows. */
export async function getAllReviews(): Promise<Review[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("approved", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return (data as ReviewRow[]).map(rowToReview);
  } catch {
    return [];
  }
}
