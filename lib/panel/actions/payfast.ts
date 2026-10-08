"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getPanelUser } from "@/lib/panel/auth";
import { PAYFAST_AUTO_CANCEL_NOTE, PAYFAST_TOPUP_TIMEOUT_MS } from "@/lib/panel/payfast-timeout";

export type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

/** Must match PANEL_BASKET_PREFIX in api/src/payments/panel-topup.service.ts —
 *  it is how the gateway callback knows a payment is a wallet top-up and not a
 *  shop order. */
const BASKET_PREFIX = "PNL-";

/** PayFast rejects a BASKET_ID over 20 chars; this builds a 16-char one. */
function newBasketId(): string {
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `${BASKET_PREFIX}${rand}`;
}

const MIN_TOPUP = 100;
const MAX_TOPUP = 500_000;
export type PayFastHandoff = {
  action: string;
  fields: Record<string, string>;
  basketId: string;
  amount: string;
};

/**
 * Cancel a PayFast top-up the customer abandoned before paying.
 *
 * We retain the row for reconciliation and use the existing `rejected` DB
 * state with an explicit customer-cancelled note. A gateway transaction id
 * means PayFast has already responded, so that request must settle normally.
 */
export async function cancelPayFastTopUp(requestId: string): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const db = getSupabaseAdmin();
  const { data: request, error: findError } = await db
    .from("panel_payment_requests")
    .select("id, user_id, gateway, status, gateway_txn_id")
    .eq("id", requestId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (findError) return { ok: false, error: "Could not check that payment." };
  if (!request) return { ok: false, error: "That payment request was not found." };
  if (request.gateway !== "payfast") return { ok: false, error: "Only PayFast payments can be cancelled here." };
  if (request.status !== "pending") return { ok: false, error: "This payment is no longer pending." };
  if (request.gateway_txn_id) {
    return { ok: false, error: "PayFast has already responded. Please wait for the final payment result." };
  }

  const { data: cancelled, error } = await db
    .from("panel_payment_requests")
    .update({
      status: "rejected",
      admin_note: "Cancelled by customer — PayFast checkout was not completed.",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", request.id)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .is("gateway_txn_id", null)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: "Could not cancel that payment." };
  if (!cancelled) return { ok: false, error: "The payment status changed. Refresh and check it again." };

  revalidatePath("/panel/wallet");
  return { ok: true };
}

/** Expire this customer's abandoned PayFast checkouts after 30 seconds. */
export async function expirePendingPayFastTopUps(): Promise<Result<{ cancelled: number }>> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const cutoff = new Date(Date.now() - PAYFAST_TOPUP_TIMEOUT_MS).toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("panel_payment_requests")
    .update({
      status: "rejected",
      admin_note: PAYFAST_AUTO_CANCEL_NOTE,
      reviewed_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("gateway", "payfast")
    .eq("status", "pending")
    .is("gateway_txn_id", null)
    .lte("created_at", cutoff)
    .select("id");

  if (error) return { ok: false, error: "Could not refresh pending payments." };
  if (data?.length) revalidatePath("/panel/wallet");
  return { ok: true, data: { cancelled: data?.length ?? 0 } };
}

/**
 * Start a PayFast wallet top-up.
 *
 * Creates the pending request first, then asks the API for a gateway token.
 * That order matters: the request row has to exist before the customer can
 * possibly come back from PayFast, otherwise a fast redirect could arrive
 * before we'd recorded what they were paying for.
 *
 * Nothing here credits the wallet. The balance moves only when PayFast
 * confirms the payment to the API, hash-verified — see panel-topup.service.ts.
 * A customer who fakes a return URL gets a page, not money.
 */
export async function startPayFastTopUp(input: {
  amount: number;
  mobile: string;
}): Promise<Result<PayFastHandoff>> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount < MIN_TOPUP) {
    return { ok: false, error: `The smallest top-up is ${MIN_TOPUP.toLocaleString()} PKR.` };
  }
  if (amount > MAX_TOPUP) {
    return { ok: false, error: `The largest single top-up is ${MAX_TOPUP.toLocaleString()} PKR.` };
  }

  const mobile = String(input.mobile || "").replace(/\D/g, "");
  if (mobile.length < 10) {
    return { ok: false, error: "Enter the mobile number registered with your bank or wallet." };
  }

  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  if (!base) return { ok: false, error: "Payments are not configured. Please contact support." };

  const db = getSupabaseAdmin();
  const basketId = newBasketId();

  const { data: request, error: insertError } = await db
    .from("panel_payment_requests")
    .insert({
      user_id: user.id,
      amount,
      method: "payfast",
      gateway: "payfast",
      basket_id: basketId,
      status: "pending",
      note: "Card / bank / wallet via PayFast",
    })
    .select("id")
    .single();

  if (insertError || !request) {
    return { ok: false, error: "Could not start the payment. Please try again." };
  }

  let payload: {
    success?: boolean;
    action?: string;
    fields?: Record<string, string>;
    amount?: string;
    message?: string;
  };

  try {
    const res = await fetch(`${base}/payments/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        basketId,
        amount,
        currency: "PKR",
        customerEmail: user.email,
        customerMobile: mobile,
        customerName: user.name || undefined,
        description: `SubscribAI panel wallet top-up`,
      }),
      signal: AbortSignal.timeout(25_000),
    });
    payload = await res.json().catch(() => ({}));

    if (!res.ok || !payload?.success || !payload.action || !payload.fields) {
      await markUnstarted(request.id, payload?.message);
      return {
        ok: false,
        error: payload?.message || "The payment gateway did not accept the request. Please try again.",
      };
    }
  } catch {
    await markUnstarted(request.id, "Could not reach the payment gateway.");
    return { ok: false, error: "Could not reach the payment gateway. Please try again in a moment." };
  }

  revalidatePath("/panel/wallet");
  return {
    ok: true,
    data: {
      action: payload.action,
      fields: payload.fields,
      basketId,
      amount: payload.amount || amount.toFixed(2),
    },
  };
}

/**
 * The customer never reached PayFast, so this request can't ever be paid.
 * Marked failed rather than deleted — a top-up that vanishes from the list is
 * more confusing than one that says it didn't start.
 */
async function markUnstarted(id: string, reason?: string) {
  await getSupabaseAdmin()
    .from("panel_payment_requests")
    .update({
      status: "failed",
      admin_note: (reason || "Could not start the payment.").slice(0, 500),
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending");
}
