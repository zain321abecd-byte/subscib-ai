"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";

type Props = {
  id: string;
  name: string;
  price: number;
  iconClass?: string;
  className?: string;
};

export default function AddToCartButton({ id, name, price, iconClass, className }: Props) {
  const { add } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add({ id, name, price, iconClass });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Add ${name} to cart`}
      className={
        className ??
        `mt-3 inline-flex w-full items-center justify-center gap-2 h-11 rounded-md font-semibold text-[13px] uppercase tracking-wider transition-colors ${
          justAdded
            ? "bg-accent-500 text-ink-1000"
            : "bg-brand-500 active:bg-brand-700 text-white shadow-[0_10px_24px_-12px_rgba(255,122,26,0.7)]"
        }`
      }
    >
      {justAdded ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5 9-11"/>
          </svg>
          Added to cart
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 4h2l2.4 11.2A2 2 0 0 0 9.36 17H17.5a2 2 0 0 0 1.96-1.6L21 8H6"/>
            <path d="M12 11v4M10 13h4"/>
          </svg>
          Add to cart
        </>
      )}
    </button>
  );
}
