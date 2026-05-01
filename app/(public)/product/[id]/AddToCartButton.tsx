"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/products";

export default function AddToCartButton({ product }: { product: Product }) {
  const cart = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    cart.add({ id: product.id, name: product.name, price: product.price, iconClass: product.iconClass, thumbClass: product.mediaClass });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
      <button type="button" className="btn btn-primary btn-large" onClick={handleAdd}>
        {added ? <><i className="fa-solid fa-check"></i> Added to cart</> : <><i className="fa-solid fa-cart-shopping"></i> Add to cart</>}
      </button>
      <Link href="/cart" className="btn btn-outline btn-large">Go to cart <i className="fa-solid fa-arrow-right"></i></Link>
    </div>
  );
}
