import { getAllProducts } from "@/lib/products";
import { getStartingPrice } from "@/lib/pricing";
import { absoluteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function xml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function plainText(value: string | undefined): string {
  return (value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Merchant Center limits IDs to 50 characters. Product URLs retain the
 * complete database slug; only Google's stable external identifier is cut. */
function merchantId(id: string): string {
  return id.length <= 50 ? id : id.slice(0, 50);
}

export async function GET() {
  const products = await getAllProducts();
  const items = products
    .map((product) => ({ product, price: getStartingPrice(product) }))
    // Google rejects zero-price products. Keep them in the shop, but do not
    // advertise them until an administrator enters a purchasable price.
    .filter(({ product, price }) => Boolean(product.imageUrl) && price > 0)
    .map(({ product, price }) => {
      const description =
        plainText(product.description).slice(0, 5_000) ||
        `${product.name} digital subscription from SubscribAI.`;

      return [
        "<item>",
        `<g:id>${xml(merchantId(product.id))}</g:id>`,
        `<title>${xml(product.name)}</title>`,
        `<description>${xml(description)}</description>`,
        `<link>${xml(absoluteUrl(`/product/${product.id}`))}</link>`,
        `<g:image_link>${xml(product.imageUrl)}</g:image_link>`,
        `<g:availability>${product.inStock === false ? "out_of_stock" : "in_stock"}</g:availability>`,
        `<g:price>${price.toFixed(2)} PKR</g:price>`,
        "<g:condition>new</g:condition>",
        `<g:brand>${xml(product.brand || "SubscribAI")}</g:brand>`,
        "<g:identifier_exists>no</g:identifier_exists>",
        "<g:adult>no</g:adult>",
        `<g:product_type>${xml("Digital subscriptions")}</g:product_type>`,
        "</item>",
      ].join("");
    })
    .join("");

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">',
    "<channel>",
    "<title>SubscribAI Products</title>",
    `<link>${xml(absoluteUrl("/shop"))}</link>`,
    "<description>Premium AI and productivity subscriptions from SubscribAI.</description>",
    items,
    "</channel>",
    "</rss>",
  ].join("");

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
