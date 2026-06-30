import { getSupabaseServer } from "@/lib/supabase/server";
import type { ProductRow } from "@/lib/supabase/types";

export type Product = {
  id: string;
  name: string;
  tag: string;
  price: number;
  description?: string;
  /** Simple-icons slug for the real brand logo. Renders via <BrandIcon> when set. */
  brand?: string;
  /** FontAwesome fallback when no brand logo is available (courses, packs). */
  iconClass: string;
  mediaClass: "media-green" | "media-blue" | "media-pink" | "media-orange";
  category: "ai-subscriptions" | "design-tools" | "productivity" | "automation" | "courses";
  featured?: boolean;
  /** Cloudinary or external image, set via admin panel. Optional. */
  imageUrl?: string;
  /** Hex color (e.g. "#10A37F") rendered behind the brand icon. */
  iconBgColor?: string;
  /** "image" | "brand". Which visual to show as the main media when both
   *  are set. Undefined → auto (image > brand). */
  displaySource?: "image" | "brand";
  /** Additional gallery images (cover stays in imageUrl). */
  gallery?: string[];
  /** false when admin marks it out of stock. */
  inStock?: boolean;
  /** When false, this product is hidden from "You may also like" sections. */
  showInRelated?: boolean;
  /** If non-empty, the admin has hand-picked these specific products to recommend
      on this product's page. Otherwise fall back to category-based suggestions. */
  relatedProductIds?: string[];
  /** Optional second-tier "Private" package. Falsy → only shared tier shows. */
  privatePrice?: number;
  privateDescription?: string;
  sharedLabel?: string;
  privateLabel?: string;
  /** Three-step product variation setup: plans, durations, and combination prices. */
  variationConfig?: unknown;
  /** Custom bullet lines shown under the price on the product detail page. */
  features?: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// DB row → Product shape mapping
// ─────────────────────────────────────────────────────────────────────────────
function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    tag: row.tag ?? "",
    price: Number(row.price),
    description: row.description ?? undefined,
    brand: row.brand ?? undefined,
    iconClass: row.icon_class ?? "fa-solid fa-cube",
    mediaClass: (row.media_class as Product["mediaClass"]) ?? "media-blue",
    category: row.category as Product["category"],
    featured: row.featured,
    imageUrl: row.image_url ?? undefined,
    iconBgColor: row.icon_bg_color ?? undefined,
    displaySource: row.display_source === "image" || row.display_source === "brand" ? row.display_source : undefined,
    gallery: Array.isArray(row.gallery) ? row.gallery.filter((u) => typeof u === "string") : undefined,
    inStock: row.in_stock,
    // Default true if the column hasn't been added yet (graceful before migration).
    showInRelated: row.show_in_related ?? true,
    relatedProductIds: Array.isArray(row.related_product_ids)
      ? row.related_product_ids.filter((id) => typeof id === "string")
      : undefined,
    privatePrice: row.private_price != null ? Number(row.private_price) : undefined,
    privateDescription: row.private_description ?? undefined,
    sharedLabel: row.shared_label ?? undefined,
    privateLabel: row.private_label ?? undefined,
    variationConfig: row.variation_config ?? undefined,
    features: Array.isArray(row.features)
      ? row.features.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      : undefined,
  };
}

function supabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// ─────────────────────────────────────────────────────────────────────────────
// Async DB-backed getters. The DATABASE is the single source of truth — the
// catalog comes only from Supabase. An empty table shows as an empty catalog;
// there is no dummy/seed fallback anywhere.
// ─────────────────────────────────────────────────────────────────────────────
export async function getAllProducts(): Promise<Product[]> {
  if (!supabaseConfigured()) return [];
  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as ProductRow[] | null ?? []).map(rowToProduct);
  } catch {
    return [];
  }
}

export async function getProduct(id: string): Promise<Product | undefined> {
  if (!supabaseConfigured()) return undefined;
  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return rowToProduct(data as ProductRow);
  } catch {
    return undefined;
  }
}

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.featured).slice(0, limit);
}
