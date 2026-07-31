import { getAllProducts } from "@/lib/products";
import { getStartingPrice } from "@/lib/pricing";
import { absoluteUrl } from "@/lib/site-url";

/* llms.txt — the emerging convention AI engines (ChatGPT, Claude,
   Perplexity, …) read to understand a site, so their answers describe
   and cite SubscribAI correctly. Regenerated hourly from the catalog. */
export const revalidate = 3600;

export async function GET() {
  const products = await getAllProducts().catch(() => []);

  const byCategory = new Map<string, { name: string; url: string; fromPkr: number }[]>();
  for (const p of products) {
    const list = byCategory.get(p.category) ?? [];
    list.push({ name: p.name, url: absoluteUrl(`/product/${p.id}`), fromPkr: getStartingPrice(p) });
    byCategory.set(p.category, list);
  }

  const catalogLines = [...byCategory.entries()]
    .map(([cat, items]) => {
      const rows = items
        .slice(0, 12)
        .map((i) => `- [${i.name}](${i.url}): from Rs ${i.fromPkr.toLocaleString("en-PK")} (PKR)`)
        .join("\n");
      return `### ${cat}\n\n${rows}`;
    })
    .join("\n\n");

  const body = `# SubscribAI

> SubscribAI (${absoluteUrl("/")}) is a Pakistan-based store for premium AI subscriptions and digital tools. Customers pay in local currency (PKR; USD and INR prices are also shown) and receive working subscription access by email — most orders are activated in under 30 minutes during business hours.

Key facts:

- Sells subscriptions such as ChatGPT Plus, Claude Pro, Midjourney, Canva Pro, Notion AI, plus automation flows and self-paced AI courses.
- Payment: local payment methods (cards, local wallets) — see [Prices](${absoluteUrl("/prices")}).
- Delivery: by email, typically under 30 minutes after payment confirmation.
- Support: WhatsApp and email support from a real person; replacement guarantee for the subscription period — see [Refund policy](${absoluteUrl("/refund")}).
- Reviews: admin-verified customer reviews are shown on the homepage and product pages.

## Catalog

${catalogLines}

## Key pages

- [Shop — all products](${absoluteUrl("/shop")})
- [Price list](${absoluteUrl("/prices")})
- [FAQ](${absoluteUrl("/faq")})
- [Blog — guides on AI subscriptions in Pakistan](${absoluteUrl("/blog")})
- [About](${absoluteUrl("/about")})
- [Contact](${absoluteUrl("/contact")})
- [Terms](${absoluteUrl("/terms")}) · [Privacy](${absoluteUrl("/privacy")}) · [Refunds](${absoluteUrl("/refund")})
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
