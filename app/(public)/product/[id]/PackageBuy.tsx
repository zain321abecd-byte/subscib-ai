"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/lib/cart";
import { Price } from "@/lib/fx";
import type { Product } from "@/lib/products";

type Tier = {
  key: "shared" | "private";
  label: string;
  price: number;
  description: string;
  icon: string;
};

export default function PackageBuy({ product }: { product: Product }) {
  const cart = useCart();
  const [added, setAdded] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const tiers: Tier[] = [
    {
      key: "shared",
      label: product.sharedLabel || "Shared",
      price: product.price,
      description: product.description || "Shared account login. Best for solo users.",
      icon: "fa-users",
    },
  ];
  if (product.privatePrice && product.privatePrice > 0) {
    tiers.push({
      key: "private",
      label: product.privateLabel || "Private",
      price: product.privatePrice,
      description: product.privateDescription || "Dedicated account, only you have access.",
      icon: "fa-shield-halved",
    });
  }

  const [activeKey, setActiveKey] = useState<Tier["key"]>("shared");
  const active = tiers.find((t) => t.key === activeKey) ?? tiers[0];

  function handleAdd() {
    cart.add({
      id: `${product.id}::${active.key}`,
      name: tiers.length > 1 ? `${product.name} — ${active.label}` : product.name,
      price: active.price,
      iconClass: product.iconClass,
      thumbClass: product.mediaClass,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <>
      <div className="package-buy">
        {tiers.length > 1 && (
          <div className="package-tier-row" role="radiogroup" aria-label="Package tier">
            {tiers.map((t) => (
              <button
                key={t.key}
                type="button"
                role="radio"
                aria-checked={activeKey === t.key}
                className={`package-tier ${activeKey === t.key ? "is-active" : ""}`}
                onClick={() => setActiveKey(t.key)}
              >
                <div className="package-tier-head">
                  <i className={`fa-solid ${t.icon}`}></i>
                  <span className="package-tier-label">{t.label}</span>
                </div>
                <div className="package-tier-price">${t.price}</div>
                <p className="package-tier-desc">{t.description}</p>
                <span className="package-tier-check">
                  <i className="fa-solid fa-check"></i>
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="package-buy-summary">
          <div className="package-buy-price">
            <Price usd={active.price} large />
            <small>one-time / month</small>
          </div>

          <div className="package-buy-actions">
            <button type="button" className="btn btn-primary btn-large" onClick={handleAdd}>
              {added ? <><i className="fa-solid fa-check"></i> Added to cart</> : <><i className="fa-solid fa-cart-shopping"></i> Add to cart</>}
            </button>
            <Link href="/cart" className="btn btn-outline btn-large">Go to cart <i className="fa-solid fa-arrow-right"></i></Link>
          </div>
        </div>
      </div>

      {/* Mobile-only sticky buy bar — portalled so it escapes any
          containing-block. Hidden on desktop via CSS. */}
      {mounted && createPortal(
        <div className="mobile-buy-bar" role="region" aria-label="Add to cart">
          <div className="mobile-buy-bar-info">
            <small>{tiers.length > 1 ? active.label : "Price"}</small>
            <Price usd={active.price} />
          </div>
          <button type="button" className="btn btn-primary mobile-buy-bar-cta" onClick={handleAdd}>
            {added ? (
              <><i className="fa-solid fa-check"></i> Added</>
            ) : (
              <><i className="fa-solid fa-cart-shopping"></i> Add to cart</>
            )}
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
