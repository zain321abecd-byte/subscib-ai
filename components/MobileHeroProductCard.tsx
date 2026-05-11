"use client";

import Link from "next/link";
import { useState } from "react";
import BrandIcon from "@/components/BrandIcon";
import { useCart } from "@/lib/cart";

type Product = {
  id: string;
  name: string;
  price: number;
  brand?: string | null;
  iconClass?: string;
};

/**
 * Carousel card for the mobile hero — image, name, price, and a quick
 * "Add to cart" button.
 *
 * The whole card is clickable (routes to /product/:id). The cart button
 * stops propagation so users can add without leaving the home page.
 */
export default function MobileHeroProductCard({
  product,
  priceLabel,
}: {
  product: Product;
  priceLabel: string;
}) {
  const { add } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const onAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add({
      id: product.id,
      name: product.name,
      price: product.price,
      iconClass: product.iconClass,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <Link
      href={`/product/${product.id}`}
      className="
        w-full h-full
        rounded-md
        bg-gradient-to-b from-white/[0.06] to-white/[0.02]
        ring-1 ring-white/10
        p-3
        flex flex-col gap-2
        active:scale-[0.98] transition-transform
      "
    >
      <div className="aspect-square rounded-sm bg-white grid place-items-center overflow-hidden">
        {product.brand ? (
          <BrandIcon name={product.brand} size={64} />
        ) : (
          <i className={`${product.iconClass}`} style={{ color: "#0F172A", fontSize: 48 }}></i>
        )}
      </div>

      <p className="text-[14px] font-semibold text-ink-50 leading-tight line-clamp-2">
        {product.name}
      </p>
      <p className="text-[13px] font-medium text-brand-500 leading-tight">{priceLabel}</p>

      <button
        type="button"
        onClick={onAdd}
        aria-label={`Add ${product.name} to cart`}
        className={`
          mt-1 inline-flex items-center justify-center gap-1.5
          h-10 rounded-md
          appearance-none border-0 cursor-pointer
          text-[13px] font-semibold
          transition-colors
          ${justAdded
            ? "bg-accent-500 text-ink-1000"
            : "bg-brand-500 active:bg-brand-700 text-white"}
        `}
      >
        {justAdded ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5 9-11"/>
            </svg>
            Added
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4h2l2.4 11.2A2 2 0 0 0 9.36 17H17.5a2 2 0 0 0 1.96-1.6L21 8H6"/>
              <path d="M12 11v4M10 13h4"/>
            </svg>
            Add to cart
          </>
        )}
      </button>
    </Link>
  );
}
