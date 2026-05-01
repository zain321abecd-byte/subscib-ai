// Sample product catalog. In production, replace with a fetch from an API,
// CMS, or database. The shape matches what ProductCard expects.

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
};

export const PRODUCTS: Product[] = [
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
  { id: "ecommerce-pack", name: "E-commerce Order Pack", tag: "Business", price: 34, iconClass: "fa-solid fa-cart-flatbed", mediaClass: "media-blue", category: "automation", description: "Connect WooCommerce or Shopify to JazzCash reconciliation, customer SMS, and inventory alerts." },

  // ── Courses ─────────────────────────────────────────────────────────
  { id: "ai-mastery", name: "AI Mastery Course (Bundle)", tag: "Course", price: 49, iconClass: "fa-solid fa-graduation-cap", mediaClass: "media-green", category: "courses", description: "Eight hours of self-paced video, 200 production-ready prompts, and 30 workflow templates. Lifetime access." },
  { id: "midjourney-mastery", name: "Midjourney Mastery", tag: "Course", price: 39, iconClass: "fa-solid fa-image", mediaClass: "media-pink", category: "courses", description: "Five-hour course on advanced prompting, style references, and client-ready visual workflows." },
  { id: "automation-bootcamp", name: "Automation Bootcamp", tag: "Course", price: 59, iconClass: "fa-solid fa-screwdriver-wrench", mediaClass: "media-orange", category: "courses", description: "Twelve-hour deep-dive on Make.com, Zapier, and n8n with 25 ready-to-import templates." },
];

export function findProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function featuredProducts(limit = 4): Product[] {
  return PRODUCTS.filter((p) => p.featured).slice(0, limit);
}
