"use client";

type Review = {
  name: string;
  initials: string;
  role: string;
  city: string;
  product?: string;
  text: string;
  color: string;
  photoUrl?: string;
};

function ReviewAvatar({
  review,
  className,
  priority = false,
}: {
  review: Review;
  className: string;
  priority?: boolean;
}) {
  const size = priority ? 88 : 54;

  if (review.photoUrl) {
    return (
      <span className={`rc-avatar-tile ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={review.photoUrl} alt="" width={size} height={size} loading="lazy" />
      </span>
    );
  }

  return (
    <span className={`rc-avatar-tile ${className}`} style={{ background: review.color }}>
      <span>{review.initials}</span>
    </span>
  );
}

export default function ReviewsCarousel({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;

  const doubled = [...reviews, ...reviews];

  return (
    <div className="rc-wrap" aria-label="Customer reviews">
      <div className="rc-track">
        {doubled.map((r, i) => (
          <article key={i} className="rc-card surface-card" aria-hidden={i >= reviews.length}>
            <div className="rc-avatar-cluster" aria-hidden="true">
              <ReviewAvatar review={r} className="rc-avatar-main" priority />
            </div>

            <div className="rc-content">
              <span className="rc-mark" aria-hidden="true">
                &ldquo;
              </span>
              <p className="rc-quote">&quot;{r.text}&quot;</p>
              <div className="rc-stars" aria-label="5 out of 5">
                &#9733;&#9733;&#9733;&#9733;&#9733;
              </div>
            </div>

            <div className="rc-foot">
              <div className="rc-meta">
                <strong>{r.name}</strong>
                <small>
                  {[r.role, r.city].filter(Boolean).join(", ")}
                  {r.product ? ` - ${r.product}` : ""}
                </small>
              </div>
              <a
                className="rc-whatsapp"
                href="https://wa.me/15550132026"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat on WhatsApp"
              >
                <i className="fa-brands fa-whatsapp" aria-hidden="true"></i>
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
