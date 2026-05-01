import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Free AI Resources",
  description: "Free AI prompt packs, Midjourney style sheets, automation flows, and starter kits — no signup. Get them on WhatsApp instantly.",
  alternates: { canonical: "/freebies" },
};

type Freebie = {
  id: string;
  title: string;
  desc: string;
  details: string[];
  icon: string;
  media: "media-orange" | "media-pink" | "media-blue" | "media-green";
  size: string;
  format: string;
  delivery: "whatsapp" | "email";
};

const FREEBIES: Freebie[] = [
  {
    id: "prompt-pack",
    title: "100 ChatGPT Prompts",
    desc: "Curated prompts for content, SEO, copy, and automation.",
    details: ["Marketing & ads (20)", "Content & SEO (30)", "Productivity (25)", "Research (25)"],
    icon: "fa-comments", media: "media-orange",
    size: "1.2 MB", format: "PDF", delivery: "email",
  },
  {
    id: "midjourney-styles",
    title: "Midjourney Style Sheet",
    desc: "Fifty ready-made style modifiers for Midjourney v6.",
    details: ["Photorealistic styles (15)", "Illustration styles (15)", "Editorial / fashion (10)", "Pakistan-themed (10)"],
    icon: "fa-palette", media: "media-pink",
    size: "640 KB", format: "PDF", delivery: "email",
  },
  {
    id: "automation-templates",
    title: "Make.com Starter Flows",
    desc: "Three importable flows you can plug into Make.com today.",
    details: ["Lead capture → Notion CRM", "Weekly content recycler", "Invoice nudge automation"],
    icon: "fa-diagram-project", media: "media-blue",
    size: "2 files", format: "JSON", delivery: "whatsapp",
  },
  {
    id: "ai-glossary",
    title: "AI Glossary PDF",
    desc: "Plain-English explanations of LLMs, RAG, fine-tuning, and more.",
    details: ["80 terms explained", "Diagrams included", "Updated quarterly", "English + Urdu key terms"],
    icon: "fa-book", media: "media-green",
    size: "920 KB", format: "PDF", delivery: "email",
  },
  {
    id: "canva-templates",
    title: "Canva Pro Template Pack",
    desc: "Twenty Pakistan-styled Instagram and TikTok post templates.",
    details: ["10 Instagram posts", "10 TikTok / Reels covers", "Editable in Canva (free)", "Commercial use OK"],
    icon: "fa-image", media: "media-pink",
    size: "Canva link", format: "Canva", delivery: "whatsapp",
  },
  {
    id: "beginner-course",
    title: "AI Beginner Mini-Course",
    desc: "60-minute video crash course for first-time AI users.",
    details: ["Intro to ChatGPT (15 min)", "Image AI basics (15 min)", "Automation primer (15 min)", "Buying safely in PK (15 min)"],
    icon: "fa-graduation-cap", media: "media-green",
    size: "Streaming link", format: "Video", delivery: "email",
  },
];

const WHATSAPP_NUMBER = "15550132026";

export default function FreebiesPage() {
  return (
    <section className="v2-section">
      <div className="v2-container">
        <header className="v2-section-head">
          <p className="v2-eyebrow">Freebies</p>
          <h2>Free resources — no signup</h2>
          <p>Six handpicked freebies for Pakistani creators, students, and small teams. WhatsApp delivery is fastest; email works too.</p>
        </header>

        <div className="v2-product-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {FREEBIES.map((f) => {
            const waMsg = encodeURIComponent(`Hi! I'd like the free "${f.title}" please.`);
            return (
              <article key={f.id} className="product-card">
                <div className={`product-media ${f.media}`}>
                  <i className={`fa-solid ${f.icon}`}></i>
                </div>
                <div className="product-content">
                  <span className="product-tag" style={{ color: "var(--accent-300)", background: "var(--accent-soft)" }}>Free · {f.format}</span>
                  <h3>{f.title}</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)", marginTop: 4, marginBottom: "var(--space-3)" }}>{f.desc}</p>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6, marginBottom: "var(--space-4)" }}>
                    {f.details.map((d) => (
                      <li key={d} style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-soft)", fontSize: "var(--fs-sm)" }}>
                        <i className="fa-solid fa-check" style={{ color: "var(--accent-600)", fontSize: 10 }}></i>
                        {d}
                      </li>
                    ))}
                  </ul>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <a
                      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary btn-small"
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      <i className="fa-brands fa-whatsapp"></i> Get on WhatsApp
                    </a>
                    <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-xs)", whiteSpace: "nowrap" }}>{f.size}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* CTA strip */}
        <div style={{
          marginTop: "var(--space-7)",
          padding: "var(--space-5) var(--space-6)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap",
        }}>
          <div>
            <strong style={{ display: "block", color: "var(--text)", fontFamily: "var(--font-heading)", fontSize: "var(--fs-lg)", marginBottom: 4 }}>
              Want the paid versions?
            </strong>
            <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
              Full courses, automation packs, and AI subscriptions in the shop.
            </span>
          </div>
          <Link href="/shop" className="btn btn-outline">
            Browse the shop <i className="fa-solid fa-arrow-right"></i>
          </Link>
        </div>
      </div>
    </section>
  );
}
