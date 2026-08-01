import type { Product } from "@/lib/products";

export type AccountType = "private" | "shared";

export type VariationOption = {
  id: string;
  label: string;
};

export type VariationPrice = {
  planId: string;
  accountType: AccountType;
  durationId: string;
  /** Canonical price in PKR. */
  price: number;
  /** Fixed USD price for non-Asian visitors. Undefined → convert `price`
   *  with the live FX rate, which is what every region did before. */
  priceUsd?: number;
};

export type ProductVariationConfig = {
  plans: VariationOption[];
  durations: VariationOption[];
  prices: VariationPrice[];
};

export type SelectedVariation = {
  plan: VariationOption;
  accountType: AccountType;
  accountLabel: string;
  duration: VariationOption;
  price: number;
  priceUsd?: number;
};

export const ACCOUNT_TYPES: Array<{ id: AccountType; label: string }> = [
  { id: "private", label: "Private" },
  { id: "shared", label: "Shared" },
];

export function optionId(label: string, fallback: string): string {
  return (label || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || fallback;
}

function cleanOptions(raw: unknown, fallback: VariationOption[]): VariationOption[] {
  if (!Array.isArray(raw)) return fallback;
  const seen = new Set<string>();
  const out = raw
    .map((item, idx) => {
      const label = typeof item?.label === "string" ? item.label.trim() : "";
      if (!label) return null;
      const id = optionId(typeof item?.id === "string" ? item.id : label, `option-${idx + 1}`);
      if (seen.has(id)) return null;
      seen.add(id);
      return { id, label };
    })
    .filter((item): item is VariationOption => Boolean(item))
    .slice(0, 3);
  return out.length > 0 ? out : fallback;
}

export function normalizeVariationConfig(raw: unknown, fallbackPrice: number): ProductVariationConfig {
  const source = raw && typeof raw === "object" ? raw as any : {};
  const plans = cleanOptions(source.plans, [{ id: "standard", label: "Standard" }]);
  const durations = cleanOptions(source.durations, [{ id: "1-month", label: "1 Month" }]);
  const prices: VariationPrice[] = [];

  if (Array.isArray(source.prices)) {
    for (const row of source.prices) {
      const planId = typeof row?.planId === "string" ? optionId(row.planId, "") : "";
      const durationId = typeof row?.durationId === "string" ? optionId(row.durationId, "") : "";
      const accountType = row?.accountType === "shared" ? "shared" : row?.accountType === "private" ? "private" : null;
      const price = Number(row?.price);
      if (!planId || !durationId || !accountType || !Number.isFinite(price) || price < 0) continue;
      // 0 / blank means "no international price" — fall back to FX conversion.
      const rawUsd = Number(row?.priceUsd);
      const priceUsd = Number.isFinite(rawUsd) && rawUsd > 0 ? rawUsd : undefined;
      prices.push({ planId, accountType, durationId, price, ...(priceUsd ? { priceUsd } : {}) });
    }
  }

  if (prices.length === 0) {
    for (const plan of plans) {
      for (const duration of durations) {
        for (const account of ACCOUNT_TYPES) {
          prices.push({ planId: plan.id, durationId: duration.id, accountType: account.id, price: fallbackPrice });
        }
      }
    }
  }

  return { plans, durations, prices };
}

export function getProductVariationConfig(product: Product): ProductVariationConfig {
  if (product.variationConfig) {
    return normalizeVariationConfig(product.variationConfig, product.price);
  }

  const plans = [{ id: optionId(product.sharedLabel || "Standard", "standard"), label: product.sharedLabel || "Standard" }];
  const durations = [{ id: "1-month", label: "1 Month" }];
  const prices: VariationPrice[] = [
    { planId: plans[0].id, accountType: "private", durationId: durations[0].id, price: product.price },
  ];
  if (product.privatePrice && product.privatePrice > 0) {
    prices.push({ planId: plans[0].id, accountType: "shared", durationId: durations[0].id, price: product.privatePrice });
  } else {
    prices.push({ planId: plans[0].id, accountType: "shared", durationId: durations[0].id, price: product.price });
  }
  return { plans, durations, prices };
}

export function findVariationPrice(
  config: ProductVariationConfig,
  planId: string,
  accountType: AccountType,
  durationId: string,
): number | null {
  const found = config.prices.find(
    (p) => p.planId === planId && p.accountType === accountType && p.durationId === durationId,
  );
  return found ? found.price : null;
}

/** The whole price row, so callers can read the international USD price too. */
export function findVariationPriceRow(
  config: ProductVariationConfig,
  planId: string,
  accountType: AccountType,
  durationId: string,
): VariationPrice | null {
  return (
    config.prices.find(
      (p) => p.planId === planId && p.accountType === accountType && p.durationId === durationId,
    ) ?? null
  );
}

export function variationCartId(productId: string, selection: SelectedVariation): string {
  return [
    productId,
    optionId(selection.plan.id, "plan"),
    selection.accountType,
    optionId(selection.duration.id, "duration"),
  ].join("::");
}

export function variationSummary(selection?: Pick<SelectedVariation, "plan" | "accountLabel" | "duration">): string {
  if (!selection) return "";
  return `${selection.plan.label} / ${selection.accountLabel} / ${selection.duration.label}`;
}
