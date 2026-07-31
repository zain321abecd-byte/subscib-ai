"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/lib/cart";
import { validateCoupon } from "@/lib/coupon-actions";
import { useFx, formatPriceFromPKR } from "@/lib/fx";
import { getStartingPrice, hasMultiplePrices } from "@/lib/pricing";
import type { Product } from "@/lib/products";
import {
  ACCOUNT_TYPES,
  type AccountType,
  type VariationOption,
  findVariationPrice,
  getProductVariationConfig,
  variationCartId,
  variationSummary,
} from "@/lib/product-variations";

export default function PackageBuy({ product }: { product: Product }) {
  const cart = useCart();
  const config = useMemo(() => getProductVariationConfig(product), [product]);
  const { currency, usdToPkr, usdToInr, ready: fxReady } = useFx();
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<AccountType | "">("");
  const [selectedDurationId, setSelectedDurationId] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  // Promo code UI — "Have a promo code?" reveals the input (plati style).
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoPending, startPromo] = useTransition();
  useEffect(() => setMounted(true), []);
  // Plati-style condensed sticky bar — appears once the in-flow buy box
  // scrolls out of view (desktop only; CSS hides it below 1024px). The bar
  // is portaled INTO the sticky header and absolutely anchored to its
  // bottom edge (top: 100%), so it always sits flush under the header.
  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > 380);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const selectedPlan = config.plans.find((p) => p.id === selectedPlanId) ?? null;
  const selectedDuration = config.durations.find((d) => d.id === selectedDurationId) ?? null;
  const selectedAccountLabel = ACCOUNT_TYPES.find((a) => a.id === selectedAccount)?.label ?? "";

  const fmt = (pkr: number) => formatPriceFromPKR(pkr, currency, usdToPkr, fxReady, usdToInr);

  /* Per-option price hints, so shoppers can compare without clicking
     through every combination. Plans/accounts show the cheapest price
     among the still-open choices; durations show the exact price once
     plan + account are picked. */
  const minPrice = (planIds: string[], accounts: AccountType[], durationIds: string[]) => {
    let min: number | null = null;
    for (const p of planIds) for (const a of accounts) for (const d of durationIds) {
      const price = findVariationPrice(config, p, a, d);
      if (price != null && (min == null || price < min)) min = price;
    }
    return min;
  };
  const allAccounts = ACCOUNT_TYPES.map((a) => a.id);
  const allDurations = config.durations.map((d) => d.id);
  const planHint = (opt: VariationOption) => {
    const min = minPrice([opt.id], selectedAccount ? [selectedAccount] : allAccounts, allDurations);
    return min == null ? null : `from ${fmt(min)}`;
  };
  const accountHint = (accountId: AccountType) => {
    const min = minPrice(selectedPlan ? [selectedPlan.id] : config.plans.map((p) => p.id), [accountId], allDurations);
    return min == null ? null : `from ${fmt(min)}`;
  };
  const durationHint = (opt: VariationOption) => {
    if (selectedPlan && selectedAccount) {
      const price = findVariationPrice(config, selectedPlan.id, selectedAccount, opt.id);
      return price == null ? null : fmt(price);
    }
    const min = minPrice(config.plans.map((p) => p.id), allAccounts, [opt.id]);
    return min == null ? null : `from ${fmt(min)}`;
  };
  const selectedPrice =
    selectedPlan && selectedDuration && selectedAccount
      ? findVariationPrice(config, selectedPlan.id, selectedAccount, selectedDuration.id)
      : null;
  const isComplete = Boolean(selectedPlan && selectedDuration && selectedAccount && selectedPrice != null);
  const total = (selectedPrice ?? 0) * qty;

  function buildSelection() {
    if (!isComplete || !selectedPlan || !selectedDuration || !selectedAccount || selectedPrice == null) return null;
    return {
      plan: selectedPlan,
      accountType: selectedAccount,
      accountLabel: selectedAccountLabel,
      duration: selectedDuration,
      price: selectedPrice,
    };
  }

  function addToCart() {
    const selection = buildSelection();
    if (!selection) return false;
    const summary = variationSummary(selection);
    cart.add({
      id: variationCartId(product.id, selection),
      name: product.name,
      price: selection.price,
      qty,
      iconClass: product.iconClass,
      thumbClass: product.mediaClass,
      variation: {
        plan: selection.plan.label,
        accountType: selection.accountType,
        accountLabel: selection.accountLabel,
        duration: selection.duration.label,
        summary,
      },
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
    return true;
  }

  function handleBuyNow() {
    if (addToCart()) window.location.assign("/checkout");
  }

  // Starting/"from" price shown before the shopper picks a specific
  // plan+account+duration triple. Once selectedPrice is set (isComplete),
  // we swap over to the exact per-unit price.
  const startingPrice = getStartingPrice(product);
  const startingLabel = formatPriceFromPKR(startingPrice, currency, usdToPkr, fxReady, usdToInr);
  const startingPriceLabel = hasMultiplePrices(product) ? `From ${startingLabel}` : startingLabel;
  const perUnitLabel = selectedPrice == null
    ? startingPriceLabel
    : formatPriceFromPKR(selectedPrice, currency, usdToPkr, fxReady, usdToInr);
  const totalLabel = selectedPrice == null
    ? startingPriceLabel
    : formatPriceFromPKR(total, currency, usdToPkr, fxReady, usdToInr);

  function applyPromo() {
    const code = promoInput.trim();
    if (!code) { setPromoError("Enter a promo code."); return; }
    startPromo(async () => {
      const res = await validateCoupon(code);
      if (res.ok) {
        cart.applyCoupon({ code: res.coupon.code, discountType: res.coupon.discountType, value: res.coupon.value });
        setPromoError("");
        setPromoOpen(false);
        setPromoInput("");
      } else {
        setPromoError(res.error);
      }
    });
  }

  return (
    <>
      {/* Plati buy-box order: price → promo code → buttons → terms → options */}
      <div className="package-buy product-variation-picker">
        <div className="package-buy-summary">
          <div className="package-buy-price">
            <strong>{totalLabel}</strong>
            <small>
              {selectedPrice == null
                ? "Select Plan, Account Type, and Duration"
                : `${perUnitLabel} each`}
            </small>
          </div>

          {/* Live selection summary — mirrors the picks as removable-looking
              chips so the shopper always sees what they're about to buy. */}
          {(selectedPlan || selectedAccount || selectedDuration) && (
            <div className="pl-selection-chips" aria-label="Your selection">
              {selectedPlan && <span className="pl-sel-chip">{selectedPlan.label}</span>}
              {selectedAccountLabel && <span className="pl-sel-chip">{selectedAccountLabel}</span>}
              {selectedDuration && <span className="pl-sel-chip">{selectedDuration.label}</span>}
              {qty > 1 && <span className="pl-sel-chip">× {qty}</span>}
            </div>
          )}

          {/* Promo code — validated against /admin/coupons via server action */}
          <div className="pl-promo">
            {cart.coupon ? (
              <div className="pl-promo-applied">
                <span>
                  <i className="fa-solid fa-ticket"></i> <b>{cart.coupon.code}</b> applied
                  {" — "}
                  {cart.coupon.discountType === "percent"
                    ? `${cart.coupon.value}% off`
                    : `${formatPriceFromPKR(cart.coupon.value, currency, usdToPkr, fxReady, usdToInr)} off`}
                  {" at checkout"}
                </span>
                <button type="button" onClick={() => cart.removeCoupon()} aria-label="Remove promo code">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            ) : promoOpen ? (
              <div className="pl-promo-row">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => { setPromoInput(e.target.value); setPromoError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") applyPromo(); }}
                  placeholder="Enter promo code"
                  aria-label="Promo code"
                  autoFocus
                />
                <button type="button" onClick={applyPromo} disabled={promoPending}>
                  {promoPending ? "…" : "Apply"}
                </button>
              </div>
            ) : (
              <button type="button" className="pl-promo-link" onClick={() => setPromoOpen(true)}>
                Have a promo code?
              </button>
            )}
            {promoError && <p className="pl-promo-error">{promoError}</p>}
          </div>

          {/* Plati actions: square basket button + wide blue "Buy now" */}
          <div className="package-buy-actions pl-pd-actions">
            <button
              type="button"
              className="pl-pd-cartbtn"
              onClick={addToCart}
              disabled={!isComplete}
              aria-label={added ? "Added to cart" : "Add to cart"}
              title={added ? "Added to cart" : "Add to cart"}
            >
              <i className={`fa-solid ${added ? "fa-check" : "fa-basket-shopping"}`}></i>
            </button>
            <button type="button" className="pl-pd-buybtn" onClick={handleBuyNow} disabled={!isComplete}>
              Buy now
            </button>
          </div>
          <p className="pl-pd-terms">
            By clicking the button, you agree to our <a href="/terms">terms for buyers</a>
          </p>
        </div>

        <OptionGroup
          label="Plan"
          step={1}
          done={!!selectedPlan}
          options={config.plans}
          value={selectedPlanId}
          onChange={setSelectedPlanId}
          hint={planHint}
        />

        <div className="variation-group">
          <GroupLabel label="Account Type" step={2} done={!!selectedAccount} />
          <div className="variation-option-grid two">
            {ACCOUNT_TYPES.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`variation-option ${selectedAccount === opt.id ? "is-active" : ""}`}
                onClick={() => setSelectedAccount(opt.id)}
                aria-pressed={selectedAccount === opt.id}
              >
                <span className="variation-opt-label">{opt.label}</span>
                {accountHint(opt.id) && <span className="variation-opt-price">{accountHint(opt.id)}</span>}
              </button>
            ))}
          </div>
        </div>

        <OptionGroup
          label="Duration"
          step={3}
          done={!!selectedDuration}
          options={config.durations}
          value={selectedDurationId}
          onChange={setSelectedDurationId}
          hint={durationHint}
        />

        <div className="variation-quantity-row">
          <span>Quantity</span>
          <div className="variation-qty-control">
            <button type="button" onClick={() => setQty((n) => Math.max(1, n - 1))} aria-label="Decrease quantity">-</button>
            <strong>{qty}</strong>
            <button type="button" onClick={() => setQty((n) => Math.min(99, n + 1))} aria-label="Increase quantity">+</button>
          </div>
        </div>
      </div>

      {mounted && (document.querySelector(".pl-main-bar") || null) && createPortal(
        /* Desktop sticky condensed bar (plati): thumb + title + price +
           basket + Buy Now. Lives inside the sticky main bar, anchored to
           its bottom edge — always flush underneath it. */
        <div className={`pl-pd-stickybar ${showStickyBar ? "is-visible" : ""}`} role="region" aria-label="Buy this product">
          <span className="pl-pd-stickythumb" aria-hidden>
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt="" />
            ) : (
              <i className={product.iconClass}></i>
            )}
          </span>
          <strong className="pl-pd-stickytitle">{product.name}</strong>
          <strong className="pl-pd-stickyprice">{totalLabel}</strong>
          <button
            type="button"
            className="pl-pd-cartbtn"
            onClick={addToCart}
            disabled={!isComplete}
            aria-label={added ? "Added to cart" : "Add to cart"}
          >
            <i className={`fa-solid ${added ? "fa-check" : "fa-basket-shopping"}`}></i>
          </button>
          <button type="button" className="pl-pd-buybtn" onClick={handleBuyNow} disabled={!isComplete}>
            Buy Now
          </button>
        </div>,
        document.querySelector(".pl-main-bar")!,
      )}

      {mounted && createPortal(
        /* Plati-style sticky buy bar: square cart button + wide blue
           "Buy now for <price>" button, pinned above the mobile tab bar. */
        <div className="mobile-buy-bar pl-buybar" role="region" aria-label="Buy this product">
          <button
            type="button"
            className="pl-buybar-cart"
            onClick={addToCart}
            disabled={!isComplete}
            aria-label={added ? "Added to cart" : "Add to cart"}
          >
            <i className={`fa-solid ${added ? "fa-check" : "fa-basket-shopping"}`}></i>
          </button>
          <button type="button" className="pl-buybar-buy" onClick={handleBuyNow} disabled={!isComplete}>
            {isComplete ? `Buy now for ${totalLabel}` : "Select options above"}
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}

/* Numbered step label — the chip turns into a check once that group has a
   pick, so the shopper always knows how far along they are. */
function GroupLabel({ label, step, done }: { label: string; step: number; done: boolean }) {
  return (
    <div className="variation-group-label">
      <span className={`variation-step ${done ? "is-done" : ""}`} aria-hidden="true">
        {done ? <i className="fa-solid fa-check"></i> : step}
      </span>
      {label}
    </div>
  );
}

function OptionGroup({
  label,
  step,
  done,
  options,
  value,
  onChange,
  hint,
}: {
  label: string;
  step: number;
  done: boolean;
  options: VariationOption[];
  value: string;
  onChange: (id: string) => void;
  hint?: (opt: VariationOption) => string | null;
}) {
  return (
    <div className="variation-group">
      <GroupLabel label={label} step={step} done={done} />
      <div className="variation-option-grid">
        {options.slice(0, 3).map((opt) => {
          const price = hint?.(opt) ?? null;
          return (
            <button
              key={opt.id}
              type="button"
              className={`variation-option ${value === opt.id ? "is-active" : ""}`}
              onClick={() => onChange(opt.id)}
              aria-pressed={value === opt.id}
            >
              <span className="variation-opt-label">{opt.label}</span>
              {price && <span className="variation-opt-price">{price}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
