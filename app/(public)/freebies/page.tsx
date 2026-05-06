import type { Metadata } from "next";
import Link from "next/link";
import { getAllFreebies } from "@/lib/freebies";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Free AI Resources",
  description: "Free AI prompt packs, Midjourney style sheets, automation flows, and starter kits — no signup. Get them on WhatsApp instantly.",
  alternates: { canonical: "/freebies" },
};

export const revalidate = 60;

export default async function FreebiesPage() {
  const [FREEBIES, settings] = await Promise.all([getAllFreebies(), getSiteSettings()]);
  const WHATSAPP_NUMBER = settings.whatsapp_number || "15550132026";
  return (
    <section className="v2-section">
      <div className="v2-container">
        <header className="v2-section-head">
          <p className="v2-eyebrow">Freebies</p>
          <h2>Free resources — no signup</h2>
          <p>Handpicked freebies for creators, students, and small teams. WhatsApp delivery is fastest; email works too.</p>
        </header>

        <div className="freebies-grid">
          {FREEBIES.map((f) => {
            const waMsg = encodeURIComponent(f.whatsappMsg || `Hi! I'd like the free "${f.title}" please.`);
            const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`;
            return (
              <article key={f.id} className="product-card">
                <div className={`product-media ${f.media}`}>
                  <i className={`fa-solid ${f.icon}`}></i>
                </div>
                <div className="product-content">
                  <span className="product-tag" style={{ color: "var(--accent-300)", background: "var(--accent-soft)" }}>Free · {f.format}</span>
                  <h3>{f.title}</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)", marginTop: 4, marginBottom: "var(--space-3)" }}>{f.desc}</p>
                  {f.details.length > 0 && (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6, marginBottom: "var(--space-4)" }}>
                      {f.details.map((d) => (
                        <li key={d} style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-soft)", fontSize: "var(--fs-sm)" }}>
                          <i className="fa-solid fa-check" style={{ color: "var(--accent-600)", fontSize: 10 }}></i>
                          {d}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: "auto" }}>
                    {f.delivery === "whatsapp" || !f.fileUrl ? (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary btn-small"
                        style={{ flex: 1, justifyContent: "center" }}
                      >
                        <i className="fa-brands fa-whatsapp"></i> Get on WhatsApp
                      </a>
                    ) : (
                      <a
                        href={f.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary btn-small"
                        style={{ flex: 1, justifyContent: "center" }}
                      >
                        <i className="fa-solid fa-download"></i> Download
                      </a>
                    )}
                    {f.size && (
                      <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-xs)", whiteSpace: "nowrap" }}>{f.size}</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {FREEBIES.length === 0 && (
          <div className="surface-card" style={{ textAlign: "center", padding: "var(--space-7)" }}>
            <p style={{ color: "var(--text-muted)" }}>New freebies coming soon. Check back in a few days.</p>
          </div>
        )}

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
