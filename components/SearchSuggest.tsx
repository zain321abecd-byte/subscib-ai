"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import BrandIcon from "@/components/BrandIcon";
import { useFx, formatPKR, formatUSD, formatINR } from "@/lib/fx";
import { cdnImage } from "@/lib/cloudinary-url";

/* Shape returned by /api/products/search */
type Suggestion = {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
  brand?: string;
  iconClass: string;
  mediaClass: string;
  inStock: boolean;
  startingPrice: number;
  multi: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  "ai-subscriptions": "AI subscriptions",
  "design-tools": "Design & image AI",
  productivity: "Productivity",
  automation: "Automation",
  courses: "Courses",
};

const DEBOUNCE_MS = 220;
const MIN_CHARS = 1;

/** Bold the typed query inside a suggestion name (plati highlights matches). */
function Highlight({ text, query }: { text: string; query: string }) {
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0 || !query) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

/**
 * Plati-style live search: type → dropdown of matching products with
 * thumbnail + price, arrow-key navigation, Enter opens the highlighted
 * product (or the full /shop results when nothing is highlighted).
 * Used for both the desktop bar and the mobile slide-down bar — the
 * dropdown positions itself against the form, which is already
 * `position: relative` via `.pl-search`.
 */
export default function SearchSuggest({
  className = "pl-search",
  inputId,
  onNavigate,
}: {
  className?: string;
  inputId?: string;
  /** Called after a suggestion/search navigates (mobile closes its bar). */
  onNavigate?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, Suggestion[]>>(new Map());
  const router = useRouter();
  const pathname = usePathname();
  const { currency, usdToPkr, usdToInr, ready: fxReady } = useFx();

  const priceLabel = useCallback((s: Suggestion) => {
    const prefix = s.multi ? "From " : "";
    if (currency === "PKR") return `${prefix}${formatPKR(s.startingPrice)}`;
    if (!fxReady || !usdToPkr) return "";
    if (currency === "INR") return `${prefix}${formatINR((s.startingPrice / usdToPkr) * usdToInr)}`;
    return `${prefix}${formatUSD(s.startingPrice / usdToPkr)}`;
  }, [currency, usdToPkr, usdToInr, fxReady]);

  /* Debounced fetch with abort + tiny in-session cache so retyping a
     query the shopper already saw renders instantly. */
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS) {
      setItems([]);
      setLoading(false);
      return;
    }
    const cached = cacheRef.current.get(q.toLowerCase());
    if (cached) {
      setItems(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { items: Suggestion[] };
        cacheRef.current.set(q.toLowerCase(), data.items);
        setItems(data.items);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setItems([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  /* Reset the highlighted row whenever results change. */
  useEffect(() => { setActive(-1); }, [items]);

  /* Close when the route changes (navigation happened). */
  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [pathname]);

  /* Close on click/tap outside the form. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const goTo = (href: string) => {
    setOpen(false);
    onNavigate?.();
    router.push(href);
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (active >= 0 && items[active]) {
      goTo(`/product/${items[active].id}`);
      return;
    }
    if (q) goTo(`/shop?q=${encodeURIComponent(q)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || items.length === 0) {
      if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showPanel = open && query.trim().length >= MIN_CHARS;
  const listboxId = useMemo(() => `${inputId || "pl-suggest"}-listbox`, [inputId]);

  return (
    <form
      ref={formRef}
      className={className}
      role="search"
      onSubmit={submit}
      /* action kept for no-JS fallback — JS path preventDefaults. */
      action="/shop"
    >
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        name="q"
        placeholder="Product search"
        aria-label="Product search"
        autoComplete="off"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listboxId}
        aria-activedescendant={active >= 0 ? `${listboxId}-opt-${active}` : undefined}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { if (query.trim()) setOpen(true); }}
        onKeyDown={onKeyDown}
      />
      <button type="submit" aria-label="Search">
        <i className="fa-solid fa-magnifying-glass"></i>
      </button>

      {showPanel && (
        <div className="pl-suggest" role="listbox" id={listboxId} aria-label="Search suggestions">
          {loading && items.length === 0 ? (
            <div className="pl-suggest-status">
              <span className="pl-suggest-spinner" aria-hidden />
              Searching…
            </div>
          ) : items.length === 0 ? (
            <div className="pl-suggest-status">
              No products match “{query.trim()}”
            </div>
          ) : (
            <>
              <ul className="pl-suggest-list">
                {items.map((s, i) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      id={`${listboxId}-opt-${i}`}
                      role="option"
                      aria-selected={i === active}
                      className={`pl-suggest-item ${i === active ? "is-active" : ""}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => goTo(`/product/${s.id}`)}
                    >
                      <span className={`pl-suggest-thumb ${!s.imageUrl ? s.mediaClass : ""}`} aria-hidden>
                        {s.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img {...cdnImage(s.imageUrl, 48)} alt="" loading="lazy" decoding="async" />
                        ) : s.brand ? (
                          <BrandIcon name={s.brand} size={22} />
                        ) : (
                          <i className={s.iconClass}></i>
                        )}
                      </span>
                      <span className="pl-suggest-text">
                        <span className="pl-suggest-name">
                          <Highlight text={s.name} query={query.trim()} />
                        </span>
                        <span className="pl-suggest-cat">
                          {CATEGORY_LABELS[s.category] || s.category}
                          {!s.inStock && <em className="pl-suggest-oos">Out of stock</em>}
                        </span>
                      </span>
                      <span className="pl-suggest-price">{priceLabel(s)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="pl-suggest-all"
                onClick={() => goTo(`/shop?q=${encodeURIComponent(query.trim())}`)}
              >
                <i className="fa-solid fa-magnifying-glass" aria-hidden></i>
                Show all results for “{query.trim()}”
              </button>
            </>
          )}
        </div>
      )}
    </form>
  );
}
