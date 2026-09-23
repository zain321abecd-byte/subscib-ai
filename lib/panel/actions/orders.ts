"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getPanelUser } from "@/lib/panel/auth";
import { calculateCharge, type Order } from "@/lib/panel/types";

export type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

/**
 * Every panel query runs through the service-role client, because panel RLS is
 * enabled with no policies (see supabase/27-panel-smm.sql). That puts the
 * burden of scoping on this file: each statement below filters by the signed-in
 * user's id explicitly. Nothing here ever trusts an id sent from the browser.
 */

/**
 * Place an order.
 *
 * The charge is computed here from the catalog row, never taken from the
 * browser — otherwise a customer could post their own price. The wallet debit
 * goes through panel_wallet_transactions, whose trigger holds a row lock and
 * rejects an overdraft, so two orders placed at once can't spend the same
 * balance twice.
 */
export async function placeOrder(input: {
  serviceId: string;
  link: string;
  quantity: number;
}): Promise<Result<{ orderId: string; charge: number }>> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const link = (input.link || "").trim();
  const quantity = Math.floor(Number(input.quantity));

  if (!/^https?:\/\/\S+$/i.test(link)) {
    return { ok: false, error: "Enter the full link, starting with http:// or https://" };
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, error: "Enter how many you want." };
  }

  const db = getSupabaseAdmin();

  const { data: service } = await db
    .from("panel_services")
    .select("id, name, rate_per_1000, min_quantity, max_quantity, active, provider_id")
    .eq("id", input.serviceId)
    .maybeSingle();

  if (!service || !service.active) {
    return { ok: false, error: "That service is not available right now." };
  }
  if (quantity < service.min_quantity || quantity > service.max_quantity) {
    return {
      ok: false,
      error: `Quantity for this service must be between ${service.min_quantity.toLocaleString()} and ${service.max_quantity.toLocaleString()}.`,
    };
  }

  const charge = calculateCharge(service.rate_per_1000, quantity);

  // Debit first. If the balance is short the trigger raises and no order is
  // created — the alternative (order first) can leave an unpaid order behind.
  const { error: debitError } = await db.from("panel_wallet_transactions").insert({
    user_id: user.id,
    type: "debit",
    amount: charge,
    note: `${service.name} — ${quantity.toLocaleString()}`,
  });

  if (debitError) {
    if (/insufficient balance/i.test(debitError.message)) {
      return { ok: false, error: "Not enough balance. Add funds and try again." };
    }
    return { ok: false, error: "Could not take payment from your wallet. Nothing was charged." };
  }

  const { data: order, error: orderError } = await db
    .from("panel_orders")
    .insert({
      user_id: user.id,
      service_id: service.id,
      service_name: service.name,
      rate_per_1000: service.rate_per_1000,
      link,
      quantity,
      charge,
      status: "pending",
      provider_id: service.provider_id,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    // Give the money back rather than leave a debit with no order behind it.
    await db.from("panel_wallet_transactions").insert({
      user_id: user.id,
      type: "credit",
      amount: charge,
      note: "Automatic refund — order could not be created",
    });
    return { ok: false, error: "Could not create the order. Your balance has been restored." };
  }

  revalidatePath("/panel/orders");
  revalidatePath("/panel/dashboard");
  revalidatePath("/panel/transactions");
  return { ok: true, data: { orderId: order.id, charge } };
}

/**
 * Admin: move an order along, and refund automatically when it ends in a state
 * the customer shouldn't pay for. refunded_at makes a second refund impossible.
 */
export async function updateOrderStatus(
  orderId: string,
  status: Order["status"],
  note?: string,
): Promise<Result> {
  const user = await getPanelUser();
  if (!user?.isAdmin) return { ok: false, error: "Administrators only." };

  const db = getSupabaseAdmin();
  const { data: order } = await db
    .from("panel_orders")
    .select("id, user_id, charge, status, refunded_at, service_name, note")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return { ok: false, error: "That order no longer exists." };

  const { error } = await db
    .from("panel_orders")
    .update({ status, note: note?.trim() || order.note })
    .eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  const shouldRefund =
    (status === "cancelled" || status === "failed") && !order.refunded_at && Number(order.charge) > 0;
  if (shouldRefund) {
    const { error: refundError } = await db.from("panel_wallet_transactions").insert({
      user_id: order.user_id,
      type: "credit",
      amount: order.charge,
      note: `Refund — ${order.service_name}`,
      created_by: user.id,
    });
    if (!refundError) {
      await db.from("panel_orders").update({ refunded_at: new Date().toISOString() }).eq("id", orderId);
    }
  }

  revalidatePath("/panel/admin/orders");
  revalidatePath("/panel/orders");
  return { ok: true };
}

/**
 * Forward a pending order to its provider.
 *
 * Almost every SMM provider speaks the same dialect: POST key + action=add +
 * service + link + quantity, answering with { order: <id> } or { error: ... }.
 * Kept manual for now — an automatic poller needs a long-running worker, which
 * is its own piece of work.
 */
export async function sendOrderToProvider(orderId: string): Promise<Result<{ providerOrderId: string }>> {
  const user = await getPanelUser();
  if (!user?.isAdmin) return { ok: false, error: "Administrators only." };

  const db = getSupabaseAdmin();
  const { data: order } = await db
    .from("panel_orders")
    .select("id, link, quantity, provider_order_id, service_id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "That order no longer exists." };
  if (order.provider_order_id) return { ok: false, error: "This order was already sent to the provider." };

  const { data: service } = await db
    .from("panel_services")
    .select("provider_id, provider_service_id")
    .eq("id", order.service_id)
    .maybeSingle();

  if (!service?.provider_id || !service.provider_service_id) {
    return {
      ok: false,
      error: "This service has no provider mapping — fulfil it by hand, or set the provider on the service.",
    };
  }

  const { data: provider } = await db
    .from("panel_providers")
    .select("api_url, api_key, active")
    .eq("id", service.provider_id)
    .maybeSingle();

  if (!provider?.active) return { ok: false, error: "That provider is inactive." };

  try {
    const body = new URLSearchParams({
      key: provider.api_key,
      action: "add",
      service: String(service.provider_service_id),
      link: order.link,
      quantity: String(order.quantity),
    });

    const res = await fetch(provider.api_url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await res.json().catch(() => ({}) as Record<string, unknown>);

    if (!res.ok || payload?.error) {
      const detail = String(payload?.error || `HTTP ${res.status}`);
      await db.from("panel_providers").update({ last_error: detail.slice(0, 300) }).eq("id", service.provider_id);
      return { ok: false, error: `Provider refused the order: ${detail}` };
    }

    const providerOrderId = String(payload?.order ?? "");
    if (!providerOrderId) return { ok: false, error: "The provider accepted the request but returned no order id." };

    await db
      .from("panel_orders")
      .update({ provider_order_id: providerOrderId, provider_id: service.provider_id, status: "processing" })
      .eq("id", orderId);

    revalidatePath("/panel/admin/orders");
    return { ok: true, data: { providerOrderId } };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unreachable";
    return { ok: false, error: `Could not reach the provider: ${detail}` };
  }
}
