import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/products";
import { getStartingPrice, hasMultiplePrices } from "@/lib/pricing";

export const dynamic = "force-dynamic";

/** Lightweight shape sent to the header search dropdown. */
export type SearchSuggestion = {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
  brand?: string;
  iconClass: string;
  mediaClass: string;
  inStock: boolean;
  /** Cheapest price in PKR (canonical). Client converts via FX context. */
  startingPrice: number;
  /** True → show a "From" prefix (multiple variation prices exist). */
  multi: boolean;
};

const MAX_RESULTS = 8;

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (q.length < 1) return NextResponse.json({ items: [] });

  const all = await getAllProducts();

  // Rank: name-prefix matches first (what plati's suggest does), then
  // name-substring, then tag/description hits — so typing "ch" puts
  // "ChatGPT" above something merely tagged "chat".
  const scored = all
    .map((p) => {
      const name = p.name.toLowerCase();
      let score = -1;
      if (name.startsWith(q)) score = 0;
      else if (name.includes(q)) score = 1;
      else if (p.tag.toLowerCase().includes(q)) score = 2;
      else if (p.description?.toLowerCase().includes(q)) score = 3;
      return { p, score };
    })
    .filter((s) => s.score >= 0)
    .sort((a, b) => a.score - b.score || a.p.name.localeCompare(b.p.name))
    .slice(0, MAX_RESULTS);

  const items: SearchSuggestion[] = scored.map(({ p }) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    imageUrl: p.imageUrl,
    brand: p.brand,
    iconClass: p.iconClass,
    mediaClass: p.mediaClass,
    inStock: p.inStock !== false,
    startingPrice: getStartingPrice(p),
    multi: hasMultiplePrices(p),
  }));

  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } },
  );
}
