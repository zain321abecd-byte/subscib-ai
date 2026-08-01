"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { useToast } from "@/lib/toast";
import { useFx } from "@/lib/fx";
import { formatProductPriceLabel, getStartingPrice, getStartingPriceUsd } from "@/lib/pricing";
import BrandIcon from "@/components/BrandIcon";
import type { Product } from "@/lib/products";
import { croppedImageUrl } from "@/lib/image-crop";

/**
 * Plati.market-style product card:
 *   [ square media ]
 *   price (bold)
 *   title (small, 2-line clamp)
 *   meta (muted tag/category)
 *   [   Buy button   ]
 */
export default function ProductCard({ product }: { product: Product }) {
  const cart = useCart();
  const { toast } = useToast();
  const { currency, usdToPkr, usdToInr, ready: fxReady, region } = useFx();
  const [justAdded, setJustAdded] = useState(false);
  const inCart = cart.items.some((i) => i.id === product.id);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Card "Buy" adds the starting/cheapest variation — matches the price
    // the user sees on the card. Different variation → product page.
    cart.add({
      id: product.id,
      name: product.name,
      price: getStartingPrice(product),
      // Carry the fixed international price so the cart and checkout quote
      // the same figure the card showed to non-Asian visitors.
      ...(getStartingPriceUsd(product) != null ? { priceUsd: getStartingPriceUsd(product)! } : {}),
      iconClass: product.iconClass,
      thumbClass: product.mediaClass,
    });
    toast("success", "Added to cart", product.name);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  };

  // Resolve which visual takes the media slot (admin can force image/brand).
  const effective: "image" | "brand" | "fallback" =
    product.displaySource === "image" ? (product.imageUrl ? "image" : product.brand ? "brand" : "fallback") :
    product.displaySource === "brand" ? (product.brand ? "brand" : product.imageUrl ? "image" : "fallback") :
    product.imageUrl ? "image" : product.brand ? "brand" : "fallback";

  const priceLabel = formatProductPriceLabel(product, currency, usdToPkr, fxReady, usdToInr, region);
  const fromMatch = priceLabel.match(/^From\s+(.+)$/i);
  const tag = (product.tag || "").split(",").map((s) => s.trim()).filter(Boolean)[0];

  return (
    <article className="product-card pl-card" data-product-id={product.id}>
      <Link
        className={`pl-card-media ${effective === "image" ? `${product.mediaClass} has-product-image` : ""}`}
        href={`/product/${product.id}`}
        aria-label={`View ${product.name}`}
      >
        {effective === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={croppedImageUrl(product.imageUrl, product.imageCrop)}
            alt={product.name}
            loading="lazy"
          />
        ) : effective === "brand" ? (
          <BrandIcon name={product.brand!} size={64} />
        ) : (
          <i className={product.iconClass}></i>
        )}
      </Link>

      <div className="pl-card-body">
        {/* Title sits directly under the image, ahead of the price. */}
        <h3 className="pl-card-title-wrap">
          <Link className="pl-card-title" href={`/product/${product.id}`}>{product.name}</Link>
        </h3>
        <div className="pl-card-price">
          {fromMatch ? (
            <>
              <span className="pl-card-price-prefix">From</span> {fromMatch[1]}
            </>
          ) : (
            priceLabel
          )}
        </div>
        {tag && <div className="pl-card-meta">{tag}</div>}
        <button
          className={`pl-card-buy ${justAdded ? "is-just-added" : ""}`}
          type="button"
          aria-label={inCart ? `${product.name} in cart — add another` : `Add ${product.name} to cart`}
          onClick={handleAdd}
        >
          {justAdded ? (
            <><i className="fa-solid fa-check"></i> Added</>
          ) : inCart ? (
            <><i className="fa-solid fa-cart-plus"></i> Add more</>
          ) : (
            "Buy"
          )}
        </button>
      </div>
    </article>
  );
}
