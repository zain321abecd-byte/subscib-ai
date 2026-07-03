"use client";

import Link from "next/link";
import { useState } from "react";
import BrandIcon from "@/components/BrandIcon";
import { useCart } from "@/lib/cart";

type Product = {
  id: string;
  name: string;
  price: number;
  tag?: string;
  brand?: string | null;
  iconClass?: string;
};

/**
 * Carousel card for the mobile hero — image, name, price, and a quick
 * "Add to cart" button.
 *
 * The whole card is clickable (routes to /product/:id). The cart button
 * stops propagation so users can add without leaving the home page.
 *
 * `addPrice` — optional override for the "add to cart" line item.
 * The card's *displayed* label already comes from the parent (starting
 * price + optional "From "), so this makes the cart line up with
 * that display. If omitted, falls back to `product.price`.
 */
export default function MobileHeroProductCard({
  product,
  priceLabel,
  addPrice,
}: {
  product: Product;
  priceLabel: string;
  addPrice?: number;
}) {
  const { add } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const onAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add({
      id: product.id,
      name: product.name,
      price: addPrice ?? product.price,
      iconClass: product.iconClass,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <Link
      href={`/product/${product.id}`}
      className="shop-mobile-card"
    >
      <span className="shop-mobile-card-shine" aria-hidden />
      <div className="shop-mobile-media">
        {product.brand ? (
          <BrandIcon name={product.brand} size={68} />
        ) : (
          <i className={`${product.iconClass}`} style={{ color: "#0F172A", fontSize: 48 }}></i>
        )}
      </div>

      <div className="shop-mobile-copy">
        {product.tag && <span>{product.tag.split(",")[0]}</span>}
        <p>{product.name}</p>
      </div>

      <div className="shop-mobile-foot">
        <strong>{priceLabel}</strong>

        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add ${product.name} to cart`}
          className={justAdded ? "is-added" : ""}
        >
          {justAdded ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5 9-11"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4h2l2.4 11.2A2 2 0 0 0 9.36 17H17.5a2 2 0 0 0 1.96-1.6L21 8H6"/>
              <path d="M12 11v4M10 13h4"/>
            </svg>
          )}
        </button>
      </div>
    </Link>
  );
}
