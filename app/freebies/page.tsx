import Link from "next/link";

export const metadata = { title: "Freebies · SubscribAI" };

const FREEBIES = [
  { id: "prompt-pack", title: "100 ChatGPT Prompts", desc: "Curated prompts for content, SEO, and automation.", icon: "fa-comments", media: "media-orange" },
  { id: "midjourney-styles", title: "Midjourney Style Sheet", desc: "50 ready-made style modifiers for Midjourney v6.", icon: "fa-palette", media: "media-pink" },
  { id: "automation-templates", title: "Make.com Starter Flows", desc: "Three importable flows: lead capture, content, billing.", icon: "fa-diagram-project", media: "media-blue" },
  { id: "ai-glossary", title: "AI Glossary PDF", desc: "Plain-English explanations of LLMs, RAG, fine-tuning, and more.", icon: "fa-book", media: "media-green" },
];

export default function FreebiesPage() {
  return (
    <section className="v2-section">
      <div className="v2-container">
        <header className="v2-section-head">
          <p className="v2-eyebrow">Freebies</p>
          <h2>Free resources, no signup</h2>
          <p>Download these instantly. We hope they're useful — drop us a line if they save you time.</p>
        </header>
        <div className="v2-product-grid">
          {FREEBIES.map((f) => (
            <article key={f.id} className="product-card">
              <div className={`product-media ${f.media}`}>
                <i className={`fa-solid ${f.icon}`}></i>
              </div>
              <div className="product-content">
                <span className="product-tag">Free</span>
                <h3>{f.title}</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>{f.desc}</p>
                <div className="product-bottom">
                  <strong style={{ color: "var(--accent-600)" }}>FREE</strong>
                  <Link href="/contact" className="btn btn-primary btn-small">Download</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
