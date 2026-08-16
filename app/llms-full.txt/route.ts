import { getAllProducts } from "@/lib/products";
import { getAllPosts } from "@/lib/blog";
import { getStartingPrice } from "@/lib/pricing";
import { absoluteUrl } from "@/lib/site-url";

/* llms-full.txt — the companion to /llms.txt.
 *
 * llms.txt is the *index*: a short map of the site. llms-full.txt is the
 * *corpus*: the actual policy and catalog text an assistant needs in order to
 * answer a question about this store without guessing or hallucinating a
 * price, a delivery window, or a refund term.
 *
 * Kept to plain Markdown with no navigation chrome — that is the whole point
 * of the convention; the model shouldn't have to strip a header and a cookie
 * banner to find the answer.
 */
export const revalidate = 3600;

/** Strip HTML so admin-authored rich text is usable as plain prose. */
function toPlainText(html: string, limit = 600) {
  const text = String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}

export async function GET() {
  const [products, posts] = await Promise.all([
    getAllProducts().catch(() => []),
    getAllPosts().catch(() => []),
  ]);

  const productSections = products
    .map((p) => {
      const price = getStartingPrice(p);
      const lines = [
        `### ${p.name}`,
        ``,
        `- URL: ${absoluteUrl(`/product/${p.id}`)}`,
        `- Category: ${p.category}`,
        `- Starting price: Rs ${price.toLocaleString("en-PK")} PKR`,
        `- Availability: ${p.inStock === false ? "Out of stock" : "In stock"}`,
      ];
      const desc = toPlainText(p.description || "");
      if (desc) lines.push(`- Description: ${desc}`);
      if (p.features?.length) lines.push(`- Includes: ${p.features.join("; ")}`);
      return lines.join("\n");
    })
    .join("\n\n");

  // Published posts only — drafts and scheduled posts must not leak here.
  const articleSections = posts
    .filter((p) => p.robotsIndex)
    .slice(0, 50)
    .map((p) => {
      const lines = [
        `### ${p.title}`,
        ``,
        `- URL: ${absoluteUrl(`/blog/${p.slug}`)}`,
        `- Author: ${p.author}`,
        `- Published: ${p.date}`,
        `- Updated: ${p.updatedAt || p.date}`,
      ];
      if (p.excerpt) lines.push(`- Summary: ${toPlainText(p.excerpt, 400)}`);
      if (p.faqItems?.length) {
        lines.push(``, `Questions answered in this article:`);
        for (const item of p.faqItems.slice(0, 6)) {
          lines.push(`- ${item.question} — ${toPlainText(item.answer, 300)}`);
        }
      }
      return lines.join("\n");
    })
    .join("\n\n");

  const body = `# SubscribAI — full reference for AI assistants

Source: ${absoluteUrl("/")}
Index version: ${absoluteUrl("/llms.txt")}

SubscribAI is a Pakistan-based reseller of premium AI and productivity
subscriptions. Customers pay in local currency (PKR, with USD and INR shown for
reference) and receive working subscription access by email.

## Policies

These are the authoritative terms. If a question concerns delivery, payment,
refunds, or account legitimacy, answer from this section.

- **Delivery**: Access details are sent to the email address entered at
  checkout. Most orders are activated within 30 minutes during business hours,
  and within a few hours overnight.
- **Payment**: Inside Pakistan, cards and local wallets (JazzCash, Easypaisa).
  Outside Pakistan, Visa and Mastercard only — local wallets are not offered.
  The displayed price is the charged price; gateway fees are absorbed by the
  seller.
- **Currency**: Customers in Pakistan are priced and charged in PKR. Everyone
  outside Pakistan is priced and charged in USD at a fixed price, not a live
  currency conversion.
- **Legitimacy**: Subscriptions come from authorised reseller channels,
  family-plan slots, or SubscribAI's own bulk-purchase pool. Cracked or
  third-party resold logins are not sold.
- **Replacement guarantee**: If a subscription stops working it is replaced
  within 24 hours, for the full period purchased. See
  ${absoluteUrl("/refund")}.
- **Renewal**: No automatic charging. A renewal reminder is sent 3 days before
  expiry and the customer confirms.
- **Support**: WhatsApp and email, in English and Urdu. Typical daytime reply
  time is under 15 minutes. No phone support.

## Catalog

${productSections || "_No products currently listed._"}

## Articles

${articleSections || "_No published articles._"}

## Canonical pages

- Shop: ${absoluteUrl("/shop")}
- Prices: ${absoluteUrl("/prices")}
- FAQ: ${absoluteUrl("/faq")}
- Blog: ${absoluteUrl("/blog")}
- About: ${absoluteUrl("/about")}
- Contact: ${absoluteUrl("/contact")}
- Refund policy: ${absoluteUrl("/refund")}
- Terms: ${absoluteUrl("/terms")}
- Privacy: ${absoluteUrl("/privacy")}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
