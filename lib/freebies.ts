import { getSupabaseServer } from "@/lib/supabase/server";
import type { FreebieRow } from "@/lib/supabase/types";

export type Freebie = {
  id: string;
  title: string;
  desc: string;
  details: string[];
  icon: string;
  media: "media-orange" | "media-pink" | "media-blue" | "media-green";
  size: string;
  format: string;
  delivery: "whatsapp" | "email";
  fileUrl: string | null;
  whatsappMsg: string | null;
};

const MEDIA: Freebie["media"][] = ["media-orange", "media-pink", "media-blue", "media-green"];

export const STATIC_FREEBIES: Freebie[] = [
  {
    id: "prompt-pack",
    title: "100 ChatGPT Prompts",
    desc: "Curated prompts for content, SEO, copy, and automation.",
    details: ["Marketing & ads (20)", "Content & SEO (30)", "Productivity (25)", "Research (25)"],
    icon: "fa-comments", media: "media-orange",
    size: "1.2 MB", format: "PDF", delivery: "email",
    fileUrl: null, whatsappMsg: null,
  },
  {
    id: "midjourney-styles",
    title: "Midjourney Style Sheet",
    desc: "Fifty ready-made style modifiers for Midjourney v6.",
    details: ["Photorealistic styles (15)", "Illustration styles (15)", "Editorial / fashion (10)", "Cultural / regional (10)"],
    icon: "fa-palette", media: "media-pink",
    size: "640 KB", format: "PDF", delivery: "email",
    fileUrl: null, whatsappMsg: null,
  },
  {
    id: "automation-templates",
    title: "Make.com Starter Flows",
    desc: "Three importable flows you can plug into Make.com today.",
    details: ["Lead capture → Notion CRM", "Weekly content recycler", "Invoice nudge automation"],
    icon: "fa-diagram-project", media: "media-blue",
    size: "2 files", format: "JSON", delivery: "whatsapp",
    fileUrl: null, whatsappMsg: null,
  },
  {
    id: "ai-glossary",
    title: "AI Glossary PDF",
    desc: "Plain-English explanations of LLMs, RAG, fine-tuning, and more.",
    details: ["80 terms explained", "Diagrams included", "Updated quarterly", "Beginner-friendly explanations"],
    icon: "fa-book", media: "media-green",
    size: "920 KB", format: "PDF", delivery: "email",
    fileUrl: null, whatsappMsg: null,
  },
  {
    id: "canva-templates",
    title: "Canva Pro Template Pack",
    desc: "Twenty creator-ready Instagram and TikTok post templates.",
    details: ["10 Instagram posts", "10 TikTok / Reels covers", "Editable in Canva (free)", "Commercial use OK"],
    icon: "fa-image", media: "media-pink",
    size: "Canva link", format: "Canva", delivery: "whatsapp",
    fileUrl: null, whatsappMsg: null,
  },
  {
    id: "beginner-course",
    title: "AI Beginner Mini-Course",
    desc: "60-minute video crash course for first-time AI users.",
    details: ["Intro to ChatGPT (15 min)", "Image AI basics (15 min)", "Automation primer (15 min)", "Buying premium AI safely (15 min)"],
    icon: "fa-graduation-cap", media: "media-green",
    size: "Streaming link", format: "Video", delivery: "email",
    fileUrl: null, whatsappMsg: null,
  },
];

function inferFormat(url: string | null): string {
  if (!url) return "Free";
  const u = url.toLowerCase();
  if (u.endsWith(".pdf")) return "PDF";
  if (u.endsWith(".json")) return "JSON";
  if (u.endsWith(".zip")) return "ZIP";
  if (u.endsWith(".mp4") || u.endsWith(".mov")) return "Video";
  if (u.includes("canva.com")) return "Canva";
  if (u.includes("youtu") || u.includes("vimeo")) return "Video";
  return "File";
}

function rowToFreebie(row: FreebieRow, idx: number): Freebie {
  return {
    id: row.id,
    title: row.title,
    desc: row.description,
    details: [],
    icon: row.icon_class || "fa-gift",
    media: MEDIA[idx % MEDIA.length],
    size: "",
    format: inferFormat(row.file_url),
    delivery: row.whatsapp_msg ? "whatsapp" : "email",
    fileUrl: row.file_url,
    whatsappMsg: row.whatsapp_msg,
  };
}

function supabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function getAllFreebies(): Promise<Freebie[]> {
  // Static demo set is only used when Supabase isn't configured (e.g. local
  // dev without env vars). Once Supabase is wired, the admin's `freebies`
  // table is the source of truth — an empty table means "show nothing".
  if (!supabaseConfigured()) return STATIC_FREEBIES;
  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("freebies")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });
    if (error || !data) return [];
    return (data as FreebieRow[]).map(rowToFreebie);
  } catch {
    return [];
  }
}
