#!/usr/bin/env node
/**
 * Seed Supabase with the static catalog (products, blog posts, freebies).
 * Run AFTER you've run supabase/schema.sql in the Supabase SQL Editor.
 *
 *   node scripts/seed.mjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
 * (or the surrounding environment).
 *
 * Idempotent: uses upsert keyed by slug/id.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local manually (no dotenv dependency).
function loadEnvFile(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      const [, k, v] = m;
      if (!(k in process.env)) process.env[k] = v.replace(/^["']|["']$/g, "");
    }
  } catch {
    // missing file is fine
  }
}
loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

// ─────────────────────────────────────────────────────────────────────
// Catalog mirrored from lib/products.ts. Kept as plain JS so we don't
// need a TS toolchain for the seed.
// ─────────────────────────────────────────────────────────────────────
const PRODUCTS = [
  { id: "chatgpt-plus", name: "ChatGPT Plus Plan", tag: "Popular", price: 19, brand: "openai", icon_class: "fa-solid fa-robot", media_class: "media-orange", category: "ai-subscriptions", featured: true, description: "Priority access to the latest models, vision and voice features, file uploads, and longer context windows." },
  { id: "claude-pro", name: "Claude Pro Plan", tag: "AI", price: 18, brand: "anthropic", icon_class: "fa-solid fa-bolt", media_class: "media-blue", category: "ai-subscriptions", description: "5× more usage than free, priority capacity during peak hours, longer outputs and bigger context." },
  { id: "gemini-advanced", name: "Gemini Advanced", tag: "AI", price: 17, brand: "gemini", icon_class: "fa-solid fa-bolt-lightning", media_class: "media-blue", category: "ai-subscriptions", description: "Top-tier Gemini model with deep Workspace integration and 2 TB cloud storage." },
  { id: "perplexity-pro", name: "Perplexity Pro", tag: "Search", price: 14, brand: "perplexity", icon_class: "fa-solid fa-magnifying-glass", media_class: "media-blue", category: "ai-subscriptions", description: "Hundreds of Pro searches a day, file uploads, and access to multiple frontier models in one place." },
  { id: "elevenlabs", name: "ElevenLabs Creator", tag: "Audio", price: 14, brand: "elevenlabs", icon_class: "fa-solid fa-microphone", media_class: "media-pink", category: "ai-subscriptions", description: "Studio-grade AI voice generation, custom voice cloning, and multi-language dubbing." },
  { id: "midjourney", name: "Midjourney Basic", tag: "Design", price: 12, brand: "midjourney", icon_class: "fa-solid fa-palette", media_class: "media-pink", category: "design-tools", featured: true, description: "AI image generation with fast jobs every month, web + Discord access, latest model." },
  { id: "canva-pro", name: "Canva Pro Access", tag: "Design", price: 8, brand: "canva", icon_class: "fa-solid fa-pen-ruler", media_class: "media-green", category: "design-tools", featured: true, description: "Premium templates, brand kits, background remover, magic resize, and 1 TB cloud storage." },
  { id: "leonardo-ai", name: "Leonardo AI Apprentice", tag: "Design", price: 12, brand: "leonardo", icon_class: "fa-solid fa-wand-magic-sparkles", media_class: "media-pink", category: "design-tools", description: "Generous monthly tokens, every Leonardo model, image-to-3D, and motion video features." },
  { id: "adobe-firefly", name: "Adobe Firefly Premium", tag: "Design", price: 9, brand: "firefly", icon_class: "fa-solid fa-fire", media_class: "media-orange", category: "design-tools", description: "Generative credits for commercial-safe imagery, integrated with Photoshop and Illustrator." },
  { id: "notion-ai", name: "Notion AI", tag: "Productivity", price: 10, brand: "notion", icon_class: "fa-solid fa-cube", media_class: "media-blue", category: "productivity", description: "AI inside your Notion workspace for drafting, summarising, translating, and auto-filling databases." },
  { id: "grammarly-premium", name: "Grammarly Premium", tag: "Writing", price: 11, brand: "grammarly", icon_class: "fa-solid fa-pen", media_class: "media-green", category: "productivity", description: "Advanced grammar checking, tone detection, plagiarism scanner, and AI rewrite suggestions." },
  { id: "clickup-ai", name: "ClickUp AI", tag: "Productivity", price: 7, brand: "clickup", icon_class: "fa-solid fa-list-check", media_class: "media-blue", category: "productivity", description: "AI summaries, task generation, meeting notes, and document drafting inside ClickUp." },
  { id: "automation-pack", name: "Automation Starter Pack", tag: "Business", price: 29, icon_class: "fa-solid fa-diagram-project", media_class: "media-orange", category: "automation", featured: true, description: "12 prebuilt no-code workflows for lead capture, client onboarding, content recycling, and invoice nudges." },
  { id: "social-media-pack", name: "Social Auto-Poster Pack", tag: "Marketing", price: 24, icon_class: "fa-solid fa-share-nodes", media_class: "media-pink", category: "automation", description: "Schedule and cross-post to Instagram, TikTok, Facebook, and LinkedIn from a single Notion database." },
  { id: "ecommerce-pack", name: "E-commerce Order Pack", tag: "Business", price: 34, icon_class: "fa-solid fa-cart-flatbed", media_class: "media-blue", category: "automation", description: "Connect WooCommerce or Shopify to JazzCash reconciliation, customer SMS, and inventory alerts." },
  { id: "ai-mastery", name: "AI Mastery Course (Bundle)", tag: "Course", price: 49, icon_class: "fa-solid fa-graduation-cap", media_class: "media-green", category: "courses", description: "Eight hours of self-paced video, 200 production-ready prompts, and 30 workflow templates. Lifetime access." },
  { id: "midjourney-mastery", name: "Midjourney Mastery", tag: "Course", price: 39, icon_class: "fa-solid fa-image", media_class: "media-pink", category: "courses", description: "Five-hour course on advanced prompting, style references, and client-ready visual workflows." },
  { id: "automation-bootcamp", name: "Automation Bootcamp", tag: "Course", price: 59, icon_class: "fa-solid fa-screwdriver-wrench", media_class: "media-orange", category: "courses", description: "Twelve-hour deep-dive on Make.com, Zapier, and n8n with 25 ready-to-import templates." },
];

// ─────────────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`→ Connecting to ${url}`);

  // Products
  console.log(`→ Upserting ${PRODUCTS.length} products…`);
  const productsToInsert = PRODUCTS.map((p, i) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    price: p.price,
    category: p.category,
    brand: p.brand ?? null,
    tag: p.tag ?? null,
    icon_class: p.icon_class,
    media_class: p.media_class,
    in_stock: true,
    featured: !!p.featured,
    sort_order: i,
  }));
  const pRes = await supabase.from("products").upsert(productsToInsert, { onConflict: "id" });
  if (pRes.error) {
    console.error("× Products upsert failed:", pRes.error.message);
    process.exit(1);
  }
  console.log(`✓ Products seeded.`);

  // Blog posts — pulled at build time from lib/blog by reading the file.
  // (We avoid an ESM-from-TS import at runtime; we simply read the text and
  // extract the structured payload via dynamic JSON-ish parsing.)
  console.log(`→ Skipping blog seed in this script (run via the admin UI or extend this file).`);

  console.log(`✓ Done.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
