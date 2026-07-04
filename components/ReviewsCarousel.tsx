"use client";

/**
 * Auto-scrolling review strip. Every card is the exact same size no
 * matter how long the review text is — clamped to a fixed line
 * count with a "Read more" button that opens ReviewFullModal.
 */
import { useState } from "react";
import ReviewFullModal from "./ReviewFullModal";

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

/** Rough threshold for when a review is likely to overflow the clamp. */
const READ_MORE_THRESHOLD = 200;

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

/**
 * A single card in the strip. Isolated so it can own the "show full
 * review" state without every neighbour sharing a bloated context.
 */
function ReviewCarouselCard({ review, ariaHidden }: { review: Review; ariaHidden: boolean }) {
  const [open, setOpen] = useState(false);
  const isLong = review.text.length > READ_MORE_THRESHOLD;

  return (
    <>
      <article className="rc-card surface-card" aria-hidden={ariaHidden}>
        <div className="rc-avatar-cluster" aria-hidden="true">
          <ReviewAvatar review={review} className="rc-avatar-main" priority />
        </div>

        <div className="rc-content">
          <span className="rc-mark" aria-hidden="true">&ldquo;</span>
          <p className="rc-quote rc-clamp">{review.text}</p>
          {isLong && (
            <button
              type="button"
              className="rc-readmore"
              onClick={() => setOpen(true)}
              aria-label={`Read full review from ${review.name}`}
            >
              Read more <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </button>
          )}
          <div className="rc-stars" aria-label="5 out of 5">
            &#9733;&#9733;&#9733;&#9733;&#9733;
          </div>
        </div>

        <div className="rc-foot">
          <div className="rc-meta">
            <strong>{review.name}</strong>
            <small>
              {[review.role, review.city].filter(Boolean).join(", ")}
              {review.product ? ` - ${review.product}` : ""}
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

      <ReviewFullModal
        open={open}
        onClose={() => setOpen(false)}
        name={review.name}
        role={[review.role, review.city].filter(Boolean).join(", ")}
        product={review.product}
        rating={5}
        text={review.text}
        photoUrl={review.photoUrl}
        initials={review.initials}
        color={review.color}
      />
    </>
  );
}

export default function ReviewsCarousel({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;

  const doubled = [...reviews, ...reviews];

  return (
    <div className="rc-wrap" aria-label="Customer reviews">
      <div className="rc-track">
        {doubled.map((r, i) => (
          <ReviewCarouselCard key={i} review={r} ariaHidden={i >= reviews.length} />
        ))}
      </div>
    </div>
  );
}
