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

export const REVIEWS: Review[] = [
  { name: "Ali R.", initials: "AR", role: "Marketing manager", city: "Lahore", product: "ChatGPT Plus Plan", color: "var(--brand-soft)", text: "Ordered ChatGPT Plus on a Sunday night, paid with JazzCash, login arrived in 12 minutes. Cleanest reseller experience I've had in Pakistan." },
  { name: "Sara H.", initials: "SH", role: "Freelance designer", city: "Karachi", product: "Automation Starter Pack", color: "var(--accent-soft)", text: "The automation pack saved me about six hours a week on client reporting. The Make.com flows were already configured for the way I work." },
  { name: "Usman K.", initials: "UK", role: "Agency owner", city: "Islamabad", product: "Midjourney Basic", color: "var(--info-soft)", text: "Midjourney glitched on me one night. Sent a WhatsApp message - replacement credentials in five minutes. That's the kind of support that earns repeat orders." },
  { name: "Fatima A.", initials: "FA", role: "MBA student", city: "Lahore", product: "Claude Pro Plan", color: "var(--warning-soft)", text: "I was paying for ChatGPT through a friend abroad. SubscribAI is half the hassle and I get my own credentials. Wish I'd switched sooner." },
  { name: "Bilal S.", initials: "BS", role: "YouTube creator", city: "Rawalpindi", product: "Canva Pro Access", color: "var(--brand-soft)", text: "Canva Pro went live in eight minutes. I run a content channel - I needed it the same day. Worked perfectly. Renewed for the year." },
  { name: "Aisha M.", initials: "AM", role: "Boutique owner", city: "Karachi", product: "Social Auto-Poster Pack", color: "var(--accent-soft)", text: "I run a small clothing brand. The social auto-poster cut my Instagram time from two hours a day to thirty minutes. Worth ten times what I paid." },
];

/** International testimonials shown to non-PK visitors. No Pakistan/PKR/JazzCash references. */
export const REVIEWS_GLOBAL: Review[] = [
  { name: "Daniel M.", initials: "DM", role: "Product designer", city: "Berlin", product: "ChatGPT Plus Plan", color: "var(--brand-soft)", text: "Card payment went through instantly and credentials hit my inbox in 10 minutes on a weekend. The flow felt indistinguishable from buying direct." },
  { name: "Priya S.", initials: "PS", role: "Freelance writer", city: "Singapore", product: "Claude Pro Plan", color: "var(--accent-soft)", text: "I switched from juggling three different AI accounts to managing them all here. Renewals are predictable and support actually replies the same day." },
  { name: "Marco T.", initials: "MT", role: "Agency owner", city: "Milan", product: "Midjourney Basic", color: "var(--info-soft)", text: "Midjourney access landed in my inbox in under ten minutes. When I needed help mid-project, support replied on WhatsApp within five minutes." },
  { name: "Hannah L.", initials: "HL", role: "Content creator", city: "Toronto", product: "Canva Pro Access", color: "var(--warning-soft)", text: "Canva Pro was activated faster than I could finish my coffee. I run a small brand - needing tools the same day matters. Renewed for a year." },
  { name: "Omar F.", initials: "OF", role: "Operations lead", city: "Dubai", product: "Automation Starter Pack", color: "var(--brand-soft)", text: "The Make.com flows were already wired up for client reporting. Cut my Sunday admin from six hours to barely one." },
  { name: "Emily R.", initials: "ER", role: "PhD researcher", city: "London", product: "ChatGPT Plus Plan", color: "var(--accent-soft)", text: "Cleanest checkout experience I've used for this category. No surprise renewals, no awkward forex charges, login arrived right after payment." },
];

import { getRegion } from "@/lib/region";
import { getAllReviews, isSupabaseConfigured } from "@/lib/reviews";
import ReviewsCarousel from "@/components/ReviewsCarousel";

/**
 * Customer review section. Pass a subset of reviews to display, or omit
 * to fetch admin-curated reviews from the DB.
 *
 * Behavior when no `reviews` prop is given:
 *   - Supabase configured + has approved reviews -> render those.
 *   - Supabase configured but DB empty -> return null (hide section entirely).
 *   - Supabase NOT configured (local dev) -> fall back to region-aware static set.
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
  const [region, dbReviews] = await Promise.all([getRegion(), getAllReviews()]);
  const isPK = region === "PK";

  let defaultPool: Review[];
  if (dbReviews.length > 0) {
    defaultPool = dbReviews;
  } else if (!isSupabaseConfigured()) {
    defaultPool = isPK ? REVIEWS : REVIEWS_GLOBAL;
  } else {
    defaultPool = [];
  }

  const list = reviews ?? defaultPool;

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

      <ReviewsCarousel reviews={list} />

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
