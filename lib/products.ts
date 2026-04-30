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
  { id: "chatgpt-plus", name: "ChatGPT Plus Plan", tag: "Popular", price: 19, brand: "openai", iconClass: "fa-solid fa-robot", mediaClass: "media-orange", category: "ai-subscriptions", featured: true, description: "GPT-4 access with priority queue, vision, and longer context." },
  { id: "claude-pro", name: "Claude Pro Plan", tag: "AI", price: 18, brand: "anthropic", iconClass: "fa-solid fa-bolt", mediaClass: "media-blue", category: "ai-subscriptions", description: "Claude 3.5 Sonnet access, longer outputs, priority capacity." },
  { id: "midjourney", name: "Midjourney Basic", tag: "Design", price: 12, brand: "midjourney", iconClass: "fa-solid fa-palette", mediaClass: "media-pink", category: "design-tools", featured: true, description: "AI image generation with 200 fast jobs/month." },
  { id: "canva-pro", name: "Canva Pro Access", tag: "Design", price: 8, brand: "canva", iconClass: "fa-solid fa-pen-ruler", mediaClass: "media-green", category: "design-tools", featured: true, description: "Pro templates, brand kits, magic resize, background remover." },
  { id: "notion-ai", name: "Notion AI", tag: "Productivity", price: 10, brand: "notion", iconClass: "fa-solid fa-cube", mediaClass: "media-blue", category: "productivity", description: "AI in your Notion workspace — draft, summarize, translate." },
  { id: "automation-pack", name: "Automation Starter Pack", tag: "Business", price: 29, iconClass: "fa-solid fa-diagram-project", mediaClass: "media-orange", category: "automation", featured: true, description: "12 prebuilt Make.com & Zapier flows for content, leads, billing." },
  { id: "ai-mastery", name: "AI Mastery Course", tag: "Course", price: 49, iconClass: "fa-solid fa-graduation-cap", mediaClass: "media-green", category: "courses", description: "8-hour self-paced course + 200 prompts + workflow templates." },
  { id: "elevenlabs", name: "ElevenLabs Creator", tag: "Audio", price: 14, brand: "elevenlabs", iconClass: "fa-solid fa-microphone", mediaClass: "media-pink", category: "ai-subscriptions", description: "AI voice generation, voice cloning, and dubbing." },
];

export function findProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function featuredProducts(limit = 4): Product[] {
  return PRODUCTS.filter((p) => p.featured).slice(0, limit);
}
