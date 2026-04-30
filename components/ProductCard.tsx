"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { useToast } from "@/lib/toast";
import BrandIcon from "@/components/BrandIcon";
import type { Product } from "@/lib/products";

export default function ProductCard({ product }: { product: Product }) {
  const cart = useCart();
  const { toast } = useToast();
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

  return (
    <article className="product-card" data-product-id={product.id}>
      <Link className={`product-media ${product.mediaClass}`} href={`/product/${product.id}`} aria-label={`View ${product.name}`}>
        {product.brand
          ? <span className="product-media-brand"><BrandIcon name={product.brand} size={48} color="ffffff" /></span>
          : <i className={product.iconClass}></i>
        }
      </Link>
      <div className="product-content">
        <span className="product-tag">{product.tag}</span>
        <h3>{product.name}</h3>
        <div className="product-bottom">
          <div className="product-card-price">
            <b>${product.price}</b>
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
