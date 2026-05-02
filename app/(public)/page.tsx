import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import Typewriter from "@/components/Typewriter";
import BrandIcon from "@/components/BrandIcon";
import Reviews from "@/components/Reviews";
import TrustBadges from "@/components/TrustBadges";
import { getFeaturedProducts } from "@/lib/products";
import { getSiteSettings } from "@/lib/site-settings";

export const revalidate = 60;

export default async function HomePage() {
  const [featured, settings] = await Promise.all([
    getFeaturedProducts(4),
    getSiteSettings(),
  ]);
  const heroHeadline = settings.hero_headline || "Premium AI tools,";
  const heroSubtext  = settings.hero_subtext  || "Pay in PKR via JazzCash, Easypaisa, or any local card. Activated to your inbox within 30 minutes, backed by replacement guarantees and real WhatsApp support.";

  return (
    <>
      {/* HERO */}
      <section className="v2-hero">
        <div className="v2-hero-bg" aria-hidden />
        <div className="v2-container v2-hero-grid">
          <div className="v2-hero-copy">
            <span className="badge badge-brand"><i className="fa-solid fa-heart"></i> Made with Love · Trusted by 12,000+ creators</span>
            <h1>
              {heroHeadline}<br />
              <Typewriter
                phrases={[
                  "ready in 30 min.",
                  "billed in PKR.",
                  "backed by humans.",
                  "without the forex.",
                ]}
                typingMs={75}
                holdMs={2000}
                fadeMs={420}
              />
            </h1>
            <p className="v2-lede">
              <strong>SubscribAI is Pakistan&rsquo;s local store for premium AI subscriptions.</strong> Browse 60+ tools &mdash; from ChatGPT Plus and Claude Pro to Midjourney, Canva, and Notion AI &mdash; alongside automation packs and full courses, curated for creators, students, and small teams.
            </p>
            <p className="v2-lede v2-lede-secondary">
              {heroSubtext}
            </p>
            <div className="v2-hero-ctas">
              <Link className="btn btn-primary btn-large" href="/shop">Browse all tools <i className="fa-solid fa-arrow-right"></i></Link>
              <Link className="btn btn-outline btn-large" href="/prices">View pricing</Link>
            </div>
            <ul className="v2-trust-row">
              <li><i className="fa-solid fa-shield-halved"></i> Secure SahulatPay gateway</li>
              <li><i className="fa-solid fa-clock"></i> Activated in &lt; 30 min</li>
              <li><i className="fa-brands fa-whatsapp"></i> WhatsApp support</li>
            </ul>
          </div>

          <aside className="v2-hero-preview" aria-label="Featured tools">
            <div className="v2-hero-preview-card">
              <div className="v2-hero-preview-head">
                <span className="v2-hero-preview-dot"></span>
                <span className="v2-hero-preview-dot"></span>
                <span className="v2-hero-preview-dot"></span>
                <span className="v2-hero-preview-url">subscribai.com/shop</span>
              </div>
              <div className="v2-hero-preview-tiles">
                {[
                  { brand: "openai", t: "ChatGPT Plus", p: "$8 / month", b: "Active", bc: "badge-success", bg: "var(--brand-soft)" },
                  { brand: "midjourney", t: "Midjourney Basic", p: "$10 / month", b: "Popular", bc: "badge-brand", bg: "var(--accent-soft)" },
                  { brand: "canva", t: "Canva Pro", p: "$5 / month", b: "New", bc: "badge-accent", bg: "var(--info-soft)" },
                  { brand: "anthropic", t: "Claude Pro", p: "$19 / month", bg: "var(--warning-soft)" },
                ].map((tile, idx) => (
                  <div className="v2-mini-card" key={idx}>
                    <span className="v2-mini-icon" style={{ background: tile.bg }}>
                      <BrandIcon name={tile.brand} size={20} />
                    </span>
                    <div>
                      <strong>{tile.t}</strong>
                      <small>{tile.p}</small>
                    </div>
                    {tile.b && <span className={`badge ${tile.bc}`}>{tile.b}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="v2-hero-blob v2-hero-blob-1" aria-hidden />
            <div className="v2-hero-blob v2-hero-blob-2" aria-hidden />
          </aside>
        </div>
      </section>

      {/* QUICK VALUE STRIP — answers "what is this" without scrolling */}
      <section className="v2-value-strip">
        <div className="v2-container v2-value-grid">
          {[
            { i: "fa-mobile-screen-button", t: "1. Browse & pick", d: "Pick from 60+ AI tools, courses & automation packs in our shop." },
            { i: "fa-money-bill-transfer", t: "2. Pay in PKR", d: "JazzCash, Easypaisa, or local card via the SahulatPay gateway." },
            { i: "fa-envelope-circle-check", t: "3. Get access in 30 min", d: "Login details delivered to your email — usually in under 15 minutes." },
          ].map((step) => (
            <div key={step.t} className="v2-value-item">
              <span className="v2-value-icon"><i className={`fa-solid ${step.i}`}></i></span>
              <div>
                <strong>{step.t}</strong>
                <small>{step.d}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCTS — show real, buyable items immediately after the hero */}
      <section className="v2-section reveal">
        <div className="v2-container">
          <header className="v2-section-head v2-section-head-split">
            <div>
              <p className="v2-eyebrow">Featured</p>
              <h2>Most popular this month</h2>
            </div>
            <Link href="/shop" className="btn btn-outline">View all <i className="fa-solid fa-arrow-right"></i></Link>
          </header>
          <div className="v2-product-grid">
            {featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* CATEGORIES — browse by type, second-fold */}
      <section className="v2-section v2-section-elevated reveal">
        <div className="v2-container">
          <header className="v2-section-head">
            <p className="v2-eyebrow">What we offer</p>
            <h2>Six categories, one checkout</h2>
            <p>Pick what fits your workflow. Mix and match — we deliver each item as soon as your payment confirms.</p>
          </header>
          <div className="v2-cat-grid reveal reveal-stagger">
            {[
              { href: "/shop#ai-subscriptions", icon: "fa-comments", title: "AI Subscriptions", desc: "ChatGPT Plus, Claude Pro, Gemini, Perplexity — premium plans at local prices.", c: "var(--brand-600)", bg: "var(--brand-soft)" },
              { href: "/shop#design-tools", icon: "fa-palette", title: "Design & Image AI", desc: "Midjourney, Leonardo, Adobe Firefly, Canva Pro — for creators and marketers.", c: "var(--accent-600)", bg: "var(--accent-soft)" },
              { href: "/shop#productivity", icon: "fa-bolt-lightning", title: "Productivity Tools", desc: "Notion AI, Grammarly Premium, ClickUp AI, Otter — work faster with AI.", c: "var(--info-500)", bg: "var(--info-soft)" },
              { href: "/shop#automation", icon: "fa-diagram-project", title: "Automation Packs", desc: "Make.com, Zapier templates, n8n flows — pre-built workflows you can import.", c: "var(--warning-500)", bg: "var(--warning-soft)" },
              { href: "/shop#courses", icon: "fa-graduation-cap", title: "Courses & Tutorials", desc: "Self-paced AI courses with downloadable templates and lifetime access.", c: "var(--success-500)", bg: "var(--success-soft)" },
              { href: "/freebies", icon: "fa-gift", title: "Freebies", desc: "Free prompts, templates, and starter kits — no signup, instant download.", c: "var(--danger-500)", bg: "var(--danger-soft)" },
            ].map((cat) => (
              <Link key={cat.href} href={cat.href} className="surface-card is-interactive v2-cat-card">
                <span className="v2-cat-icon" style={{ background: cat.bg, color: cat.c }}><i className={`fa-solid ${cat.icon}`}></i></span>
                <h3>{cat.title}</h3>
                <p>{cat.desc}</p>
                <span className="v2-cat-arrow">Browse <i className="fa-solid fa-arrow-right"></i></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* LOGO BAND — brand recognition (demoted lower) */}
      <section className="v2-logos">
        <div className="v2-container">
          <p className="v2-logos-label">We resell official subscriptions for</p>
          <div className="v2-logos-row">
            {[
              ["fa-comments", "ChatGPT"], ["fa-bolt", "Claude"], ["fa-palette", "Midjourney"],
              ["fa-pen-ruler", "Canva"], ["fa-cube", "Notion AI"], ["fa-video", "CapCut"], ["fa-microphone", "ElevenLabs"],
            ].map(([icon, name]) => (
              <span key={name}><i className={`fa-solid ${icon}`}></i> {name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST BADGES — concrete promises before the discursive "why us" section */}
      <TrustBadges />

      {/* WHY US */}
      <section className="v2-section v2-section-elevated reveal">
        <div className="v2-container">
          <header className="v2-section-head">
            <p className="v2-eyebrow">Why SubscribAI</p>
            <h2>Built for buyers in Pakistan</h2>
            <p>We solve the three things that make foreign subscriptions a pain locally — payment, delivery, and support.</p>
          </header>
          <div className="v2-why-grid reveal reveal-stagger">
            {[
              { icon: "fa-money-bill-transfer", t: "Pay in PKR", d: "JazzCash, Easypaisa, and local cards via SahulatPay. No forex, no rejected international transactions.", c: "var(--brand-600)", bg: "var(--brand-soft)" },
              { icon: "fa-bolt", t: "Instant activation", d: "Most subscriptions go live in under 30 minutes. Digital downloads arrive immediately via email.", c: "var(--accent-600)", bg: "var(--accent-soft)" },
              { icon: "fa-rotate", t: "Easy renewals", d: "Renewal reminders before expiry. Replacements within 24 hours if anything goes wrong with a subscription.", c: "var(--info-500)", bg: "var(--info-soft)" },
              { icon: "fa-whatsapp", t: "Real human support", d: "WhatsApp + email support, 24/7. Average reply time under 15 minutes during the day.", c: "var(--success-500)", bg: "var(--success-soft)", brand: true },
            ].map((w) => (
              <div key={w.t} className="surface-card v2-why-card">
                <span className="v2-why-icon" style={{ background: w.bg, color: w.c }}>
                  <i className={`${w.brand ? "fa-brands" : "fa-solid"} ${w.icon}`}></i>
                </span>
                <h3>{w.t}</h3>
                <p>{w.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CUSTOMER REVIEWS — social proof before stats */}
      <Reviews
        eyebrow="Reviews"
        title="What our customers say"
        intro="Real Pakistani creators, students, and small teams using SubscribAI today."
      />

      {/* STATS */}
      <section className="v2-stats-band reveal">
        <div className="v2-container v2-stats-grid">
          {[["12K+", "Active customers"], ["60+", "Tools listed"], ["< 30 min", "Average activation"], ["4.9 / 5", "Customer rating"]].map(([n, l]) => (
            <div key={l}><strong>{n}</strong><span>{l}</span></div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="v2-section v2-section-elevated reveal">
        <div className="v2-container v2-faq-wrap">
          <header className="v2-section-head">
            <p className="v2-eyebrow">Questions</p>
            <h2>Frequently asked</h2>
          </header>
          <div className="v2-faq reveal reveal-stagger">
            {[
              ["How fast do I get my subscription after paying?", "Most AI subscription accounts are activated within 30 minutes during business hours (9 AM – 11 PM PKT), and within a few hours overnight. You'll receive your login by email and a WhatsApp confirmation."],
              ["What payment methods do you accept?", "JazzCash, Easypaisa, and any local debit or credit card via the SahulatPay secure gateway. We do not store any card details — payment is handled entirely by SahulatPay."],
              ["Are these legitimate accounts?", "Yes — every subscription is from an authorized reseller channel, family-plan slot, or our own bulk-purchase pool. We don't sell cracked or shared logins from sketchy sources."],
              ["What if my account stops working?", "Tell us on WhatsApp or email and we'll replace it within 24 hours. Subscriptions come with full-period replacement guarantees."],
              ["Can I cancel a bundle anytime?", "Yes — bundle subscriptions are month-to-month with no contracts. Cancel any time before your renewal date and you won't be charged again."],
            ].map(([q, a]) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="v2-section">
        <div className="v2-container">
          <div className="v2-final-cta reveal">
            <div>
              <h2>Pick your first AI tool today</h2>
              <p>Start with one subscription, scale up when you're ready. No setup fees, no contracts.</p>
            </div>
            <div className="v2-final-cta-actions">
              <Link className="btn btn-primary btn-large" href="/shop">Browse the shop <i className="fa-solid fa-arrow-right"></i></Link>
              <a className="btn btn-outline btn-large" href="https://wa.me/15550132026"><i className="fa-brands fa-whatsapp"></i> WhatsApp us</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
