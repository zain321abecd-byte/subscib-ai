"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/lib/cart";
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
  useEffect(() => setMounted(true), []);

  const selectedPlan = config.plans.find((p) => p.id === selectedPlanId) ?? null;
  const selectedDuration = config.durations.find((d) => d.id === selectedDurationId) ?? null;
  const selectedAccountLabel = ACCOUNT_TYPES.find((a) => a.id === selectedAccount)?.label ?? "";
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

  return (
    <>
      <div className="package-buy product-variation-picker">
        <OptionGroup
          label="Plan"
          options={config.plans}
          value={selectedPlanId}
          onChange={setSelectedPlanId}
        />

        <div className="variation-group">
          <div className="variation-group-label">Account Type</div>
          <div className="variation-option-grid two">
            {ACCOUNT_TYPES.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`variation-option ${selectedAccount === opt.id ? "is-active" : ""}`}
                onClick={() => setSelectedAccount(opt.id)}
                aria-pressed={selectedAccount === opt.id}
              >
                <span>{opt.label}</span>
                <i className="fa-solid fa-check"></i>
              </button>
            ))}
          </div>
        </div>

        <OptionGroup
          label="Duration"
          options={config.durations}
          value={selectedDurationId}
          onChange={setSelectedDurationId}
        />

        <div className="variation-quantity-row">
          <span>Quantity</span>
          <div className="variation-qty-control">
            <button type="button" onClick={() => setQty((n) => Math.max(1, n - 1))} aria-label="Decrease quantity">-</button>
            <strong>{qty}</strong>
            <button type="button" onClick={() => setQty((n) => Math.min(99, n + 1))} aria-label="Increase quantity">+</button>
          </div>
        </div>

        <div className="package-buy-summary">
          <div className="package-buy-price">
            <strong>{totalLabel}</strong>
            <small>
              {selectedPrice == null
                ? "Select Plan, Account Type, and Duration"
                : `${perUnitLabel} each`}
            </small>
          </div>

          <div className="package-buy-actions">
            <button type="button" className="btn btn-primary btn-large" onClick={addToCart} disabled={!isComplete}>
              {added ? <><i className="fa-solid fa-check"></i> Added to cart</> : <><i className="fa-solid fa-cart-shopping"></i> Add to cart</>}
            </button>
            <button type="button" className="btn btn-outline btn-large" onClick={handleBuyNow} disabled={!isComplete}>
              Buy now <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>

      {mounted && createPortal(
        <div className="mobile-buy-bar" role="region" aria-label="Add to cart">
          <div className="mobile-buy-bar-info">
            <small>{isComplete ? variationSummary(buildSelection()!) : "Select options"}</small>
            <strong>{totalLabel}</strong>
          </div>
          <button type="button" className="btn btn-primary mobile-buy-bar-cta" onClick={addToCart} disabled={!isComplete}>
            {added ? (
              <><i className="fa-solid fa-check"></i> Added</>
            ) : (
              <><i className="fa-solid fa-cart-shopping"></i> Add</>
            )}
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}

function OptionGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: VariationOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="variation-group">
      <div className="variation-group-label">{label}</div>
      <div className="variation-option-grid">
        {options.slice(0, 3).map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`variation-option ${value === opt.id ? "is-active" : ""}`}
            onClick={() => onChange(opt.id)}
            aria-pressed={value === opt.id}
          >
            <span>{opt.label}</span>
            <i className="fa-solid fa-check"></i>
          </button>
        ))}
      </div>
    </div>
  );
}
