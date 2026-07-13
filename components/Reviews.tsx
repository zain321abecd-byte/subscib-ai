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

import { getAllReviews } from "@/lib/reviews";
import { getContactLinks } from "@/lib/contact-links";
import ReviewsCarousel from "@/components/ReviewsCarousel";

/**
 * Customer review section. Pass a subset of reviews to display, or omit
 * to fetch admin-curated reviews from the DB.
 *
 * Behavior when no `reviews` prop is given:
 *   - Approved database reviews -> render those.
 *   - No approved reviews -> return null (hide section entirely).
 */
export default async function Reviews({
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
  const [dbReviews, { whatsappUrl }] = await Promise.all([getAllReviews(), getContactLinks()]);
  const list = reviews ?? dbReviews;

  if (list.length === 0) return null;

  return (
    <section className="v2-section reveal">
      <div className="v2-container">
        <header className="v2-section-head">
          <p className="v2-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {intro && <p>{intro}</p>}
        </header>
      </div>

      <ReviewsCarousel reviews={list} whatsappUrl={whatsappUrl} />

      <div className="v2-container">
        <div className="v2-reviews-summary">
          <span className="v2-reviews-score">
            <strong>4.9 / 5</strong>
            <span className="v2-reviews-stars">★★★★★</span>
            <span>2,400+ reviews</span>
          </span>
          <span className="v2-reviews-guarantee">
            <i className="fa-solid fa-shield-halved"></i>
            Replacement guarantee on every order
          </span>
        </div>
      </div>
    </section>
  );
}
