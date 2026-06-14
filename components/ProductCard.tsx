"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { useToast } from "@/lib/toast";
import { useFx, formatPriceFromPKR } from "@/lib/fx";
import BrandIcon from "@/components/BrandIcon";
import type { Product } from "@/lib/products";

export default function ProductCard({ product }: { product: Product }) {
  const cart = useCart();
  const { toast } = useToast();
  const { currency, usdToPkr, usdToInr, ready: fxReady } = useFx();
  const [justAdded, setJustAdded] = useState(false);
  const inCart = cart.items.some((i) => i.id === product.id);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    cart.add({
      id: product.id,
      name: product.name,
      price: product.price,
      iconClass: product.iconClass,
      thumbClass: product.mediaClass,
    });
    toast("success", "Added to cart", product.name);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  };

  // Resolve which visual takes the main media slot. Admin can force
  // "image" or "brand" via displaySource; default is auto (image > brand).
  // When image is main + brand is also set → brand renders as a small corner
  // badge. Reverse case (brand as main) hides the image entirely — it's a
  // full-frame photo and would lose meaning shrunk into a tiny badge.
  const effective: "image" | "brand" | "fallback" =
    product.displaySource === "image" ? (product.imageUrl ? "image" : product.brand ? "brand" : "fallback") :
    product.displaySource === "brand" ? (product.brand ? "brand" : product.imageUrl ? "image" : "fallback") :
    product.imageUrl ? "image" : product.brand ? "brand" : "fallback";

  const showBrandBadge = effective === "image" && !!product.brand;

  const mediaStyle: React.CSSProperties | undefined =
    effective === "brand" && product.iconBgColor ? { background: product.iconBgColor } : undefined;

  return (
    <article className="product-card" data-product-id={product.id}>
      <Link
        className={`product-media ${effective === "image" ? product.mediaClass : "product-media-plain"}`}
        style={mediaStyle}
        href={`/product/${product.id}`}
        aria-label={`View ${product.name}`}
      >
        {effective === "image" ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.imageUrl} alt={product.name} className="product-media-img" loading="lazy" />
            {showBrandBadge && (
              <span className="product-media-brand-badge" aria-hidden>
                <BrandIcon name={product.brand!} size={20} />
              </span>
            )}
          </>
        ) : effective === "brand" ? (
          <span className="product-media-brand"><BrandIcon name={product.brand!} size={84} /></span>
        ) : (
          <i className={product.iconClass}></i>
        )}
      </Link>
      <div className="product-content">
        {(() => {
          const first = (product.tag || "").split(",").map((s) => s.trim()).filter(Boolean)[0];
          return first ? <span className="product-tag">{first}</span> : null;
        })()}
        <h3>{product.name}</h3>
        <div className="product-bottom">
          <div className="product-card-price">
            <b>{formatPriceFromPKR(product.price, currency, usdToPkr, fxReady, usdToInr)}</b>
          </div>
          <div className="product-actions">
            <Link className="product-icon-action" href={`/product/${product.id}`} aria-label={`View ${product.name}`} title="View details">
              <i className="fa-solid fa-eye"></i>
            </Link>
            <button
              className={`product-icon-action ${justAdded ? "is-just-added" : ""} ${inCart ? "is-in-cart" : ""}`}
              type="button"
              data-icon-action="cart"
              aria-label={inCart ? `${product.name} in cart` : `Add ${product.name} to cart`}
              title={justAdded ? "Added" : inCart ? "Add another" : "Add to cart"}
              onClick={handleAdd}
            >
              <i className={`fa-solid ${justAdded ? "fa-check" : inCart ? "fa-cart-plus" : "fa-cart-shopping"}`}></i>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
