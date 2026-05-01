/**
 * Trust badges row — shows the four core promises with icons.
 * Drop on any page that needs an extra credibility nudge (cart, checkout, product detail, home).
 */
export default function TrustBadges() {
  const BADGES = [
    { icon: "fa-shield-halved",  title: "Secure payment",        sub: "SahulatPay encrypted gateway" },
    { icon: "fa-bolt",           title: "Fast delivery",         sub: "Activated in under 30 minutes" },
    { icon: "fa-rotate",         title: "Replacement guarantee", sub: "Re-issued within 24 hours" },
    { icon: "fa-circle-check",   title: "Verified accounts",     sub: "Authorized resale only" },
  ];

  return (
    <section className="trust-badges">
      <div className="v2-container">
        <div className="trust-badges-grid">
          {BADGES.map((b) => (
            <div key={b.title} className="trust-badge">
              <span className="trust-badge-icon">
                <i className={`fa-solid ${b.icon}`}></i>
              </span>
              <div>
                <strong>{b.title}</strong>
                <small>{b.sub}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
