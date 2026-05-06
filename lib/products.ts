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
  /** Custom bullet lines shown under the price on the product detail page. */
  features?: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Static fallback. Used as the seed source AND as a safety net so the site
// keeps rendering if Supabase is unreachable or env vars aren't set yet.
// ─────────────────────────────────────────────────────────────────────────────
export const STATIC_PRODUCTS: Product[] = [
  // ── AI Subscriptions ────────────────────────────────────────────────
  { id: "chatgpt-plus", name: "ChatGPT Plus Plan", tag: "Popular", price: 19, brand: "openai", iconClass: "fa-solid fa-robot", mediaClass: "media-orange", category: "ai-subscriptions", featured: true, description: "Priority access to the latest models, vision and voice features, file uploads, and longer context windows." },
  { id: "claude-pro", name: "Claude Pro Plan", tag: "AI", price: 18, brand: "anthropic", iconClass: "fa-solid fa-bolt", mediaClass: "media-blue", category: "ai-subscriptions", description: "5× more usage than free, priority capacity during peak hours, longer outputs and bigger context." },
  { id: "gemini-advanced", name: "Gemini Advanced", tag: "AI", price: 17, brand: "gemini", iconClass: "fa-solid fa-bolt-lightning", mediaClass: "media-blue", category: "ai-subscriptions", description: "Top-tier Gemini model with deep Workspace integration and 2 TB cloud storage." },
  { id: "perplexity-pro", name: "Perplexity Pro", tag: "Search", price: 14, brand: "perplexity", iconClass: "fa-solid fa-magnifying-glass", mediaClass: "media-blue", category: "ai-subscriptions", description: "Hundreds of Pro searches a day, file uploads, and access to multiple frontier models in one place." },
  { id: "elevenlabs", name: "ElevenLabs Creator", tag: "Audio", price: 14, brand: "elevenlabs", iconClass: "fa-solid fa-microphone", mediaClass: "media-pink", category: "ai-subscriptions", description: "Studio-grade AI voice generation, custom voice cloning, and multi-language dubbing." },

  // ── Design & Image AI ───────────────────────────────────────────────
  { id: "midjourney", name: "Midjourney Basic", tag: "Design", price: 12, brand: "midjourney", iconClass: "fa-solid fa-palette", mediaClass: "media-pink", category: "design-tools", featured: true, description: "AI image generation with fast jobs every month, web + Discord access, latest model." },
  { id: "canva-pro", name: "Canva Pro Access", tag: "Design", price: 8, brand: "canva", iconClass: "fa-solid fa-pen-ruler", mediaClass: "media-green", category: "design-tools", featured: true, description: "Premium templates, brand kits, background remover, magic resize, and 1 TB cloud storage." },
  { id: "leonardo-ai", name: "Leonardo AI Apprentice", tag: "Design", price: 12, brand: "leonardo", iconClass: "fa-solid fa-wand-magic-sparkles", mediaClass: "media-pink", category: "design-tools", description: "Generous monthly tokens, every Leonardo model, image-to-3D, and motion video features." },
  { id: "adobe-firefly", name: "Adobe Firefly Premium", tag: "Design", price: 9, brand: "firefly", iconClass: "fa-solid fa-fire", mediaClass: "media-orange", category: "design-tools", description: "Generative credits for commercial-safe imagery, integrated with Photoshop and Illustrator." },

  // ── Productivity ────────────────────────────────────────────────────
  { id: "notion-ai", name: "Notion AI", tag: "Productivity", price: 10, brand: "notion", iconClass: "fa-solid fa-cube", mediaClass: "media-blue", category: "productivity", description: "AI inside your Notion workspace for drafting, summarising, translating, and auto-filling databases." },
  { id: "grammarly-premium", name: "Grammarly Premium", tag: "Writing", price: 11, brand: "grammarly", iconClass: "fa-solid fa-pen", mediaClass: "media-green", category: "productivity", description: "Advanced grammar checking, tone detection, plagiarism scanner, and AI rewrite suggestions." },
  { id: "clickup-ai", name: "ClickUp AI", tag: "Productivity", price: 7, brand: "clickup", iconClass: "fa-solid fa-list-check", mediaClass: "media-blue", category: "productivity", description: "AI summaries, task generation, meeting notes, and document drafting inside ClickUp." },

  // ── Automation Packs ────────────────────────────────────────────────
  { id: "automation-pack", name: "Automation Starter Pack", tag: "Business", price: 29, iconClass: "fa-solid fa-diagram-project", mediaClass: "media-orange", category: "automation", featured: true, description: "12 prebuilt no-code workflows for lead capture, client onboarding, content recycling, and invoice nudges." },
  { id: "social-media-pack", name: "Social Auto-Poster Pack", tag: "Marketing", price: 24, iconClass: "fa-solid fa-share-nodes", mediaClass: "media-pink", category: "automation", description: "Schedule and cross-post to Instagram, TikTok, Facebook, and LinkedIn from a single Notion database." },
  { id: "ecommerce-pack", name: "E-commerce Order Pack", tag: "Business", price: 34, iconClass: "fa-solid fa-cart-flatbed", mediaClass: "media-blue", category: "automation", description: "Connect WooCommerce or Shopify to payment reconciliation, customer SMS, and inventory alerts." },

  // ── Courses ─────────────────────────────────────────────────────────
  { id: "ai-mastery", name: "AI Mastery Course (Bundle)", tag: "Course", price: 49, iconClass: "fa-solid fa-graduation-cap", mediaClass: "media-green", category: "courses", description: "Eight hours of self-paced video, 200 production-ready prompts, and 30 workflow templates. Lifetime access." },
  { id: "midjourney-mastery", name: "Midjourney Mastery", tag: "Course", price: 39, iconClass: "fa-solid fa-image", mediaClass: "media-pink", category: "courses", description: "Five-hour course on advanced prompting, style references, and client-ready visual workflows." },
  { id: "automation-bootcamp", name: "Automation Bootcamp", tag: "Course", price: 59, iconClass: "fa-solid fa-screwdriver-wrench", mediaClass: "media-orange", category: "courses", description: "Twelve-hour deep-dive on Make.com, Zapier, and n8n with 25 ready-to-import templates." },
];

// Backwards-compat: some files still import PRODUCTS. Keep it as the static fallback.
export const PRODUCTS = STATIC_PRODUCTS;

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
    features: Array.isArray(row.features)
      ? row.features.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      : undefined,
  };
}

function supabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// ─────────────────────────────────────────────────────────────────────────────
// Async DB-backed getters (fall back to STATIC_PRODUCTS when DB unavailable)
// ─────────────────────────────────────────────────────────────────────────────
export async function getAllProducts(): Promise<Product[]> {
  if (!supabaseConfigured()) return STATIC_PRODUCTS;
  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error || !data || data.length === 0) return STATIC_PRODUCTS;
    return (data as ProductRow[]).map(rowToProduct);
  } catch {
    return STATIC_PRODUCTS;
  }
}

export async function getProduct(id: string): Promise<Product | undefined> {
  if (!supabaseConfigured()) return STATIC_PRODUCTS.find((p) => p.id === id);
  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
    if (error || !data) return STATIC_PRODUCTS.find((p) => p.id === id);
    return rowToProduct(data as ProductRow);
  } catch {
    return STATIC_PRODUCTS.find((p) => p.id === id);
  }
}

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.featured).slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// Synchronous helpers — DEPRECATED but preserved for places that haven't been
// migrated yet (sitemap, etc.). They operate on the static fallback only.
// ─────────────────────────────────────────────────────────────────────────────
export function findProduct(id: string): Product | undefined {
  return STATIC_PRODUCTS.find((p) => p.id === id);
}

export function featuredProducts(limit = 4): Product[] {
  return STATIC_PRODUCTS.filter((p) => p.featured).slice(0, limit);
}
