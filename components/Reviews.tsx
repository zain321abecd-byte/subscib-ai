type Review = {
  name: string;
  initials: string;
  role: string;
  city: string;
  product?: string;
  text: string;
  color: string;
};

export const REVIEWS: Review[] = [
  { name: "Ali R.", initials: "AR", role: "Marketing manager", city: "Lahore", product: "ChatGPT Plus Plan", color: "var(--brand-soft)", text: "Ordered ChatGPT Plus on a Sunday night, paid with JazzCash, login arrived in 12 minutes. Cleanest reseller experience I've had in Pakistan." },
  { name: "Sara H.", initials: "SH", role: "Freelance designer", city: "Karachi", product: "Automation Starter Pack", color: "var(--accent-soft)", text: "The automation pack saved me about six hours a week on client reporting. The Make.com flows were already configured for the way I work." },
  { name: "Usman K.", initials: "UK", role: "Agency owner", city: "Islamabad", product: "Midjourney Basic", color: "var(--info-soft)", text: "Midjourney glitched on me one night. Sent a WhatsApp message — replacement credentials in five minutes. That's the kind of support that earns repeat orders." },
  { name: "Fatima A.", initials: "FA", role: "MBA student", city: "Lahore", product: "Claude Pro Plan", color: "var(--warning-soft)", text: "I was paying for ChatGPT through a friend abroad. SubscribAI is half the hassle and I get my own credentials. Wish I'd switched sooner." },
  { name: "Bilal S.", initials: "BS", role: "YouTube creator", city: "Rawalpindi", product: "Canva Pro Access", color: "var(--brand-soft)", text: "Canva Pro went live in eight minutes. I run a content channel — I needed it the same day. Worked perfectly. Renewed for the year." },
  { name: "Aisha M.", initials: "AM", role: "Boutique owner", city: "Karachi", product: "Social Auto-Poster Pack", color: "var(--accent-soft)", text: "I run a small clothing brand. The social auto-poster cut my Instagram time from two hours a day to thirty minutes. Worth ten times what I paid." },
];

/**
 * Customer review section. Pass a subset of reviews to display, or omit
 * to show a default of 3 random ones.
 */
export default function Reviews({
  reviews,
  title = "What customers say",
  eyebrow = "Reviews",
  intro,
}: {
  reviews?: Review[];
  title?: string;
  eyebrow?: string;
  intro?: string;
}) {
  const list = reviews || REVIEWS.slice(0, 3);

  return (
    <section className="v2-section reveal">
      <div className="v2-container">
        <header className="v2-section-head">
          <p className="v2-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {intro && <p>{intro}</p>}
        </header>

        <div className="v2-testimonials reveal reveal-stagger">
          {list.map((r) => (
            <article key={r.name + r.text.slice(0, 10)} className="surface-card v2-testimonial">
              <div className="v2-stars" aria-label="5 out of 5">★★★★★</div>
              <p>“{r.text}”</p>
              <div className="v2-testimonial-foot">
                <span className="v2-avatar" style={{ background: r.color }}>{r.initials}</span>
                <div>
                  <strong>{r.name}</strong>
                  <small>{r.role}, {r.city}{r.product ? ` · bought ${r.product}` : ""}</small>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Aggregate trust signal under the cards */}
        <div style={{
          marginTop: "var(--space-6)",
          padding: "var(--space-4) var(--space-5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-5)",
          flexWrap: "wrap",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-pill)",
          maxWidth: 640,
          margin: "var(--space-6) auto 0",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-soft)" }}>
            <strong style={{ color: "var(--text)", fontFamily: "var(--font-heading)", fontSize: "var(--fs-lg)" }}>4.9 / 5</strong>
            <span style={{ color: "var(--warning-500)", letterSpacing: 2 }}>★★★★★</span>
            <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>· 2,400+ reviews</span>
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
            <i className="fa-solid fa-shield-halved" style={{ color: "var(--accent-500)", marginRight: 6 }}></i>
            Replacement guarantee on every order
          </span>
        </div>
      </div>
    </section>
  );
}
