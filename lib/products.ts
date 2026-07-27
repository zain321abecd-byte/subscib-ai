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
  /** Selected in admin for the secondary homepage tools section. */
  showOnHomepage?: boolean;
  /** Cloudinary or external image, set via admin panel. Optional. */
  imageUrl?: string;
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
    showOnHomepage: row.show_on_homepage ?? false,
    imageUrl: row.image_url ?? undefined,
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

const LOCAL_FALLBACK_PRODUCTS: Product[] = [
  {
    id: "chatgpt",
    name: "Chatgpt",
    tag: "Popular,New,Best Seller,AI",
    price: 1899,
    description:
      "<p><strong>ChatGPT Plus Plan - Semi Private &amp; Private Access</strong></p><p>Get premium access to ChatGPT Plus for writing, coding, research, study, business work, content creation, image generation, file analysis, brainstorming, and daily AI assistance.</p><p>Official ChatGPT Plus price is <strong>$20/month</strong>, but we are providing it at a much more affordable price:</p><p><strong>Features included:</strong></p><ul><li>ChatGPT Plus access</li><li>Works with Plus-supported models and tools</li><li>Higher usage limits than Free plan</li><li>Advanced AI assistance for coding, writing, research, study, and business</li><li>File upload and analysis support</li><li>Image generation and creative assistance</li><li>Best for students, freelancers, developers, creators, agencies, and professionals</li></ul><blockquote><strong>Choose Semi Private if you want budget-friendly premium access.</strong></blockquote><blockquote><strong>Choose Private if you want a more personal and dedicated usage experience.</strong></blockquote><p>Limited slots available. Message now to activate your ChatGPT Plus plan.</p><blockquote><strong>Note: Usage limits and available features apply according to OpenAI&rsquo;s official Plus policy.</strong></blockquote>",
    iconClass: "fa-solid fa-cube",
    mediaClass: "media-blue",
    category: "ai-subscriptions",
    featured: true,
    imageUrl: "https://res.cloudinary.com/dumhqo90g/image/upload/v1783246755/subscribai/products/kttbw1w8cbknkwjixede.jpg",
    inStock: true,
    showInRelated: true,
    relatedProductIds: ["claude-ai"],
    privatePrice: 900,
    sharedLabel: "Chatgpt Plus",
    privateLabel: "Shared",
    variationConfig: {
      plans: [{ id: "chatgpt-plus", label: "Chatgpt Plus" }],
      durations: [{ id: "1-month", label: "1 Month" }],
      prices: [
        { price: 1899, planId: "chatgpt-plus", durationId: "1-month", accountType: "private" },
        { price: 900, planId: "chatgpt-plus", durationId: "1-month", accountType: "shared" },
      ],
    },
    features: ["ChatGPT Plus access"],
  },
  {
    id: "claude-ai",
    name: "Claude Ai",
    tag: "Popular,Best Seller,AI,Productivity",
    price: 5500,
    description:
      "<p><strong>Claude AI Team Standard Seat - Semi Private &amp; Private Access</strong></p><p>Get access to Claude AI Team Standard Seat with all available Claude features and model access. Claude is best for writing, coding, research, business work, content creation, document analysis, brainstorming, and advanced AI assistance.</p><p>Official Claude Team Standard Seat price is <strong>$25/month</strong>, but we are providing it at a much lower price:</p><p><strong>Features included:</strong></p><ul><li>Claude Team Standard Seat access</li><li>Works with all available Claude models</li><li>More usage than Claude Pro</li><li>Best for coding, writing, research, study, business, and content creation</li><li>Fast and premium AI experience</li><li>Suitable for students, freelancers, developers, creators, and professionals</li></ul><p>Choose <strong>Semi Private</strong> if you want affordable access.</p><p>Choose <strong>Private</strong> if you want your own dedicated private usage experience.</p><p><strong>Limited slots available. Message now to activate your Claude AI plan.</strong></p>",
    brand: "claude",
    iconClass: "fa-solid fa-cube",
    mediaClass: "media-blue",
    category: "ai-subscriptions",
    featured: true,
    inStock: true,
    showInRelated: true,
    relatedProductIds: ["chatgpt"],
    privatePrice: 1400,
    sharedLabel: "Standard Team Plan",
    privateLabel: "Shared",
    variationConfig: {
      plans: [{ id: "standard-team-plan", label: "Standard Team Plan" }],
      durations: [{ id: "1-month", label: "1 Month" }],
      prices: [
        { price: 5500, planId: "standard-team-plan", durationId: "1-month", accountType: "private" },
        { price: 1400, planId: "standard-team-plan", durationId: "1-month", accountType: "shared" },
      ],
    },
    features: [
      "Claude Team Standard Seat access",
      "Works with all available Claude models",
      "More usage than Claude Pro",
      "Best for coding, writing, research, study, business, and content creation Fast and premium AI experience",
    ],
  },
];

function localFallbackProducts(): Product[] {
  return process.env.NODE_ENV === "production" ? [] : LOCAL_FALLBACK_PRODUCTS;
}

// ─────────────────────────────────────────────────────────────────────────────
// Async DB-backed getters. The DATABASE is the single source of truth — the
// catalog comes only from Supabase. An empty table shows as an empty catalog;
// there is no dummy/seed fallback anywhere.
// ─────────────────────────────────────────────────────────────────────────────
export async function getAllProducts(): Promise<Product[]> {
  if (!supabaseConfigured()) return localFallbackProducts();
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
  if (!supabaseConfigured()) return localFallbackProducts().find((p) => p.id === id);
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
