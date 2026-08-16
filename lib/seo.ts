import type { Product } from "@/lib/products";
import { getStartingPrice } from "@/lib/pricing";
import { slugifyBlogTitle } from "@/lib/blog-seo";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";

/**
 * Shared structured-data builders.
 *
 * Everything an answer engine (Google AI Overviews, ChatGPT, Perplexity,
 * Claude) knows about this business as an *entity* comes from here, so the
 * facts are stated once and stay consistent across every page. Previously the
 * Organization node was inlined in app/(public)/layout.tsx with only name /
 * logo / sameAs / contactPoint — enough to identify the site, not enough for a
 * model to describe what it sells, who it serves, or why it should be trusted.
 *
 * Ground rule for everything in this file: only emit a claim the page also
 * shows a human. Structured data that contradicts (or isn't present in) the
 * rendered page is a manual-action risk with Google and gets discounted by the
 * AI crawlers anyway, so there is no upside to inflating it.
 */

export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** Verifiable, non-promotional facts about the business. */
const ORG_DESCRIPTION =
  "SubscribAI is a Pakistan-based reseller of premium AI and productivity subscriptions. " +
  "Customers pay in local currency and receive working subscription access by email, " +
  "typically within 30 minutes during business hours.";

/** Subject-matter areas — this is what LLMs read to decide what the site is an authority on. */
const KNOWS_ABOUT = [
  "AI subscriptions",
  "ChatGPT Plus",
  "Claude Pro",
  "Midjourney",
  "Canva Pro",
  "Notion AI",
  "Workflow automation",
  "Digital subscription resale in Pakistan",
];

export type OrgSettings = {
  business_name?: string;
  business_address?: string;
  contact_email?: string;
  social_instagram?: string;
  social_facebook?: string;
  social_tiktok?: string;
  social_youtube?: string;
};

export function buildOrganizationSchema(settings: OrgSettings) {
  const sameAs = [
    settings.social_instagram,
    settings.social_facebook,
    settings.social_tiktok,
    settings.social_youtube,
  ]
    .map((url) => url?.trim())
    .filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: settings.business_name?.trim() || "SubscribAI",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/assets/subscribai-logo.png"),
    },
    description: ORG_DESCRIPTION,
    knowsAbout: KNOWS_ABOUT,
    // The store prices in PKR and ships credentials by email worldwide, but
    // the payment rails and support hours are built around Pakistan.
    areaServed: { "@type": "Country", name: "Pakistan" },
    ...(sameAs.length ? { sameAs } : {}),
    // Only emit an address node when the admin has actually filled one in —
    // a placeholder address is worse than no address for local trust signals.
    ...(settings.business_address?.trim()
      ? { address: { "@type": "PostalAddress", streetAddress: settings.business_address.trim(), addressCountry: "PK" } }
      : {}),
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        availableLanguage: ["en", "ur"],
        url: absoluteUrl("/contact"),
        ...(settings.contact_email ? { email: settings.contact_email } : {}),
      },
    ],
  };
}

export function buildWebsiteSchema(name = "SubscribAI") {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name,
    url: SITE_URL,
    publisher: { "@id": ORG_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/shop")}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * `speakable` tells voice assistants and answer engines which parts of the page
 * are the self-contained answer. It is scoped by CSS selector, so the selectors
 * below must match elements that actually exist and read well out of context.
 */
export function speakable(...selectors: string[]) {
  return {
    "@type": "SpeakableSpecification",
    cssSelector: selectors,
  };
}

export type QaPair = { question: string; answer: string };

/**
 * Product-page Q&A.
 *
 * These answers are rendered visibly on the product page (see the "Quick
 * answers" block) — they are not schema-only. Each one is derived from real
 * product/site data or from the same policies already published on /faq and
 * /refund, so nothing here asserts something the site doesn't otherwise say.
 */
export function buildProductFaq(product: Product, opts: { currencyLabel?: string } = {}): QaPair[] {
  const currency = opts.currencyLabel ?? "Rs";
  const from = getStartingPrice(product);
  const price = `${currency} ${from.toLocaleString("en-PK")}`;

  const faq: QaPair[] = [
    {
      question: `How much does ${product.name} cost?`,
      answer: `${product.name} starts at ${price} (PKR). Exact pricing depends on the plan length and whether you choose a shared or private plan — all options and their prices are listed on this page.`,
    },
    {
      question: `How quickly is ${product.name} delivered?`,
      answer: `Most orders are activated within 30 minutes during business hours, and within a few hours overnight. Access details are sent to the email address you enter at checkout.`,
    },
    {
      question: `Is this a legitimate ${product.name} subscription?`,
      answer: `Yes. Subscriptions are sourced from authorised reseller channels, family-plan slots, or our own bulk-purchase pool — not cracked or resold third-party logins.`,
    },
    {
      question: `What happens if ${product.name} stops working?`,
      answer: `Message us on WhatsApp or email and we replace it within 24 hours. Every subscription carries a replacement guarantee for the full period you paid for.`,
    },
    {
      question: `How do I pay for ${product.name}?`,
      answer: `You can pay with local payment methods including cards and local wallets. The price shown is the price charged — gateway fees are absorbed on our end.`,
    },
  ];

  return faq;
}

export function buildFaqSchema(items: QaPair[], opts: { speakableSelector?: string } = {}) {
  if (!items.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    ...(opts.speakableSelector ? { speakable: speakable(opts.speakableSelector) } : {}),
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/**
 * Authors are a free-text column on blog_posts rather than their own table, so
 * their URL slug is derived from the name. Lives here (not in the route file)
 * because App Router pages may only export a fixed set of names.
 */
export function authorSlug(name: string) {
  return slugifyBlogTitle(name);
}

/**
 * Author entity for E-E-A-T. Built from the blog fields that already exist
 * (author, authorBio, authorImage, authorSocialLinks) — no invented credentials.
 */
export function buildPersonSchema(input: {
  name: string;
  bio?: string;
  image?: string | null;
  socialLinks?: Record<string, string>;
  slug?: string;
}) {
  const sameAs = Object.values(input.socialLinks ?? {})
    .map((url) => String(url || "").trim())
    .filter(Boolean);

  return {
    "@type": "Person",
    ...(input.slug ? { "@id": absoluteUrl(`/author/${input.slug}#person`) } : {}),
    name: input.name,
    ...(input.bio ? { description: input.bio } : {}),
    ...(input.image ? { image: input.image } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(input.slug ? { url: absoluteUrl(`/author/${input.slug}`) } : {}),
    // Ties the author to the publisher — one of the stronger E-E-A-T signals,
    // since it makes the byline an accountable entity rather than a bare string.
    worksFor: { "@id": ORG_ID },
  };
}
