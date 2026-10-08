"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getPanelUser } from "@/lib/panel/auth";
import { internalApi } from "@/lib/internal-api";

export type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

/** The signed-in panel admin, or null. Re-checked inside every action — a page
 *  gate is routing, not authorisation. */
async function requireAdmin(): Promise<{ id: string } | null> {
  const user = await getPanelUser();
  return user?.isAdmin ? { id: user.id } : null;
}

function money(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
}

// ── wallet top-ups ─────────────────────────────────────────────────────────

/** A customer's request to add funds. Creates nothing but a request — money
 *  moves only when an admin approves it. */
export async function requestTopUp(input: {
  amount: number;
  method: string;
  reference?: string;
  note?: string;
}): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const amount = money(input.amount);
  if (amount <= 0) return { ok: false, error: "Enter the amount you paid." };

  const { error } = await getSupabaseAdmin().from("panel_payment_requests").insert({
    user_id: user.id,
    amount,
    method: (input.method || "bank").slice(0, 40),
    reference: input.reference?.trim().slice(0, 120) || null,
    note: input.note?.trim().slice(0, 500) || null,
    status: "pending",
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/panel/wallet");
  return { ok: true };
}

/**
 * Approve a top-up: credit the wallet, then mark the request. Crediting first
 * means a failure here leaves a request that can be retried, rather than a
 * request marked approved with no money behind it.
 */
export async function reviewTopUp(
  id: string,
  decision: "approved" | "rejected",
  adminNote?: string,
): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Administrators only." };

  const db = getSupabaseAdmin();
  const { data: request } = await db
    .from("panel_payment_requests")
    .select("id, user_id, amount, status, gateway")
    .eq("id", id)
    .maybeSingle();

  if (!request) return { ok: false, error: "That request no longer exists." };
  if (request.status !== "pending") return { ok: false, error: `Already ${request.status}.` };

  // A PayFast row is pending because the gateway hasn't confirmed it — usually
  // because the customer never finished paying. Approving it by hand would
  // credit a wallet for money that never arrived, so it's refused here. If a
  // payment genuinely settled but the callback was lost, use Adjust balance on
  // the Users screen: that's explicit, requires a reason, and shows on the
  // customer's statement as a manual entry rather than masquerading as a
  // gateway payment.
  if (request.gateway === "payfast" && decision === "approved") {
    return {
      ok: false,
      error:
        "This is a PayFast payment — only the gateway can confirm it. If the money really arrived, credit it with Adjust balance on the Users screen instead.",
    };
  }

  const { error: updateError } = await db.rpc("panel_review_manual_topup_atomic", {
    p_request_id: id,
    p_decision: decision,
    p_admin_note: adminNote?.trim().slice(0, 500) || "",
    p_admin_id: admin.id,
  });

  if (updateError) {
    return {
      ok: false,
      error:
        decision === "approved" ? "Could not approve the payment. Nothing was credited." : updateError.message,
    };
  }

  revalidatePath("/panel/admin/payments");
  revalidatePath("/panel/wallet");
  return { ok: true };
}

/** Admin: adjust a balance by hand, always through the ledger. */
export async function adjustBalance(
  userId: string,
  type: "credit" | "debit",
  amount: number,
  note: string,
): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Administrators only." };

  const value = money(amount);
  if (value <= 0) return { ok: false, error: "Enter an amount greater than zero." };
  if (!note.trim()) return { ok: false, error: "Give a reason — this shows on the customer's statement." };

  const { error } = await getSupabaseAdmin().from("panel_wallet_transactions").insert({
    user_id: userId,
    type,
    amount: value,
    note: note.trim().slice(0, 300),
    created_by: admin.id,
  });

  if (error) {
    return {
      ok: false,
      error: /insufficient balance/i.test(error.message)
        ? "That would take the balance below zero."
        : error.message,
    };
  }

  revalidatePath("/panel/admin/users");
  return { ok: true };
}

// ── users ──────────────────────────────────────────────────────────────────

/** Suspend someone's PANEL access. Their shop account is untouched — they can
 *  still sign in and buy subscriptions. */
export async function setUserStatus(userId: string, status: "active" | "suspended"): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Administrators only." };
  if (userId === admin.id) return { ok: false, error: "You can't suspend your own account." };

  const { error } = await getSupabaseAdmin()
    .from("panel_profiles")
    .update({ status })
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/admin/users");
  return { ok: true };
}

/** Panel role only. This has nothing to do with public.users.role or the staff
 *  portal — a panel admin is not a shop admin. */
export async function setUserRole(userId: string, role: "user" | "admin"): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Administrators only." };
  // Removing your own admin rights locks you out of this screen.
  if (userId === admin.id && role !== "admin") {
    return { ok: false, error: "You can't remove your own administrator access." };
  }

  const { error } = await getSupabaseAdmin()
    .from("panel_profiles")
    .update({ role })
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/admin/users");
  return { ok: true };
}

// ── catalog ────────────────────────────────────────────────────────────────

export type ServiceInput = {
  name: string;
  category_id: string | null;
  description?: string | null;
  rate_per_1000: number;
  min_quantity: number;
  max_quantity: number;
  speed?: string | null;
  active: boolean;
  provider_id?: string | null;
  provider_service_id?: string | null;
  provider_rate?: number | null;
};

export async function saveService(input: ServiceInput, id?: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Administrators only." };
  if (!input.name.trim()) return { ok: false, error: "Service name is required." };
  if (money(input.rate_per_1000) <= 0) return { ok: false, error: "Rate per 1000 must be more than zero." };
  if (input.min_quantity < 1) return { ok: false, error: "Minimum quantity must be at least 1." };
  if (input.max_quantity < input.min_quantity) {
    return { ok: false, error: "Maximum quantity can't be below the minimum." };
  }

  const payload = {
    name: input.name.trim().slice(0, 200),
    category_id: input.category_id || null,
    description: input.description?.trim().slice(0, 600) || null,
    rate_per_1000: money(input.rate_per_1000),
    min_quantity: Math.floor(input.min_quantity),
    max_quantity: Math.floor(input.max_quantity),
    speed: input.speed?.trim().slice(0, 80) || null,
    active: input.active,
    provider_id: input.provider_id || null,
    provider_service_id: input.provider_service_id?.trim().slice(0, 60) || null,
    provider_rate: input.provider_rate != null ? money(input.provider_rate) : null,
  };

  const db = getSupabaseAdmin();
  const { error } = id
    ? await db.from("panel_services").update(payload).eq("id", id)
    : await db.from("panel_services").insert(payload);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/admin/services");
  revalidatePath("/panel/services");
  return { ok: true };
}

export async function deleteService(id: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Administrators only." };
  const { error } = await getSupabaseAdmin().from("panel_services").delete().eq("id", id);
  if (error) {
    return { ok: false, error: "Could not delete — orders may reference it. Deactivate it instead." };
  }
  revalidatePath("/panel/admin/services");
  return { ok: true };
}

export async function deleteServices(ids: string[]): Promise<Result<{ deleted: number }>> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Administrators only." };
  const unique = [...new Set(ids)].filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 500);
  if (!unique.length) return { ok: false, error: "Select at least one service." };

  const { data, error } = await getSupabaseAdmin()
    .from("panel_services")
    .delete()
    .in("id", unique)
    .select("id");
  if (error) return { ok: false, error: `Could not delete the selected services: ${error.message}` };
  revalidatePath("/panel/admin/services");
  revalidatePath("/panel/services");
  return { ok: true, data: { deleted: data?.length ?? 0 } };
}

/** Import selected live provider services. Provider data is fetched again on
 * the server so names, limits and rates cannot be forged by the browser. */
export async function importProviderServices(
  selections: Array<{ providerId: string; serviceId: string }>,
  marginPercent = 30,
): Promise<Result<{ added: number; skipped: number }>> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Administrators only." };

  const wanted = [...new Map(
    selections
      .filter((x) => x.providerId && x.serviceId)
      .slice(0, 1000)
      .map((x) => [`${x.providerId}:${x.serviceId}`, x]),
  ).values()];
  if (!wanted.length) return { ok: false, error: "Select at least one provider service." };
  const margin = Number(marginPercent);
  if (!Number.isFinite(margin) || margin < 1 || margin > 100) {
    return { ok: false, error: "Margin must be between 1% and 100%." };
  }

  const providerIds = [...new Set(wanted.map((x) => x.providerId))];
  let added = 0;
  let skipped = 0;
  for (const providerId of providerIds) {
    const serviceIds = wanted.filter((x) => x.providerId === providerId).map((x) => String(x.serviceId));
    try {
      const result = await internalApi<{ success: true; added: number; skipped: number }>(
        `/panel-provider-services/${encodeURIComponent(providerId)}/import`,
        { method: "POST", body: { serviceIds, marginPercent: margin } },
      );
      added += result.added;
      skipped += result.skipped;
    } catch (error) {
      return { ok: false, error: `Added ${added} before import stopped: ${error instanceof Error ? error.message : "unknown error"}` };
    }
  }
  return { ok: true, data: { added, skipped } };
}

/** Reprice already-imported services from their stored provider cost. */
export async function updateServiceMargins(
  ids: string[],
  marginPercent: number,
): Promise<Result<{ updated: number }>> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Administrators only." };
  const margin = Number(marginPercent);
  if (!Number.isFinite(margin) || margin < 1 || margin > 100) {
    return { ok: false, error: "Margin must be between 1% and 100%." };
  }
  const unique = [...new Set(ids)].filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 500);
  if (!unique.length) return { ok: false, error: "Select at least one added service." };

  const db = getSupabaseAdmin();
  const { data: services, error } = await db
    .from("panel_services")
    .select("id, provider_id, provider_rate")
    .in("id", unique);
  if (error) return { ok: false, error: "Could not load the selected services." };

  const providerIds = [...new Set((services ?? []).flatMap((service) => service.provider_id ? [service.provider_id] : []))];
  const { data: providers } = providerIds.length
    ? await db.from("panel_providers").select("id, currency").in("id", providerIds)
    : { data: [] as Array<{ id: string; currency: string }> };
  const currencies = new Map((providers ?? []).map((provider) => [provider.id, String(provider.currency || "USD").toUpperCase()]));

  const updates: Array<{ id: string; rate: number }> = [];
  for (const service of services ?? []) {
    const providerRate = Number(service.provider_rate);
    if (!service.provider_id || !Number.isFinite(providerRate) || providerRate < 0) continue;
    const pkrCost = currencies.get(service.provider_id) === "PKR" ? providerRate : providerRate * 280;
    updates.push({ id: service.id, rate: Math.max(0.01, money(pkrCost * (1 + margin / 100))) });
  }
  let updated = 0;
  for (let index = 0; index < updates.length; index += 40) {
    const results = await Promise.all(updates.slice(index, index + 40).map((item) =>
      db.from("panel_services").update({ rate_per_1000: item.rate }).eq("id", item.id),
    ));
    const failed = results.find((result) => result.error);
    if (failed?.error) return { ok: false, error: `Updated ${updated} before repricing stopped: ${failed.error.message}` };
    updated += results.length;
  }
  return { ok: true, data: { updated } };
}

export async function saveCategory(name: string, platform: string, id?: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Administrators only." };
  if (!name.trim()) return { ok: false, error: "Category name is required." };

  const db = getSupabaseAdmin();
  const payload = { name: name.trim().slice(0, 120), platform };
  const { error } = id
    ? await db.from("panel_service_categories").update(payload).eq("id", id)
    : await db.from("panel_service_categories").insert(payload);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/admin/services");
  return { ok: true };
}

// ── providers ──────────────────────────────────────────────────────────────

export async function saveProvider(
  input: { name: string; api_url: string; api_key: string; active: boolean },
  id?: string,
): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Administrators only." };
  if (!input.name.trim()) return { ok: false, error: "Provider name is required." };
  if (!/^https?:\/\/\S+$/i.test(input.api_url.trim())) {
    return { ok: false, error: "Enter the full API URL, starting with https://" };
  }
  // On edit an empty key means "leave it alone" — so the existing secret isn't
  // wiped just because the form didn't re-display it.
  if (!id && !input.api_key.trim()) return { ok: false, error: "API key is required." };

  const payload: Record<string, unknown> = {
    name: input.name.trim().slice(0, 120),
    api_url: input.api_url.trim(),
    active: input.active,
  };
  if (input.api_key.trim()) payload.api_key = input.api_key.trim();

  const db = getSupabaseAdmin();
  const { error } = id
    ? await db.from("panel_providers").update(payload).eq("id", id)
    : await db.from("panel_providers").insert(payload);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/admin/providers");
  return { ok: true };
}

/** Ask the provider for our balance. The cheapest way to prove the URL and key
 *  are right without placing an order. */
export async function testProvider(id: string): Promise<Result<{ balance: string }>> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Administrators only." };

  try {
    const payload = await internalApi<{ success: true; balance: string }>(
      `/panel-providers/${encodeURIComponent(id)}/test`,
      { method: "POST" },
    );
    revalidatePath("/panel/admin/providers");
    return { ok: true, data: { balance: payload.balance } };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unreachable";
    return { ok: false, error: `Could not reach the provider: ${detail}` };
  }
}

// ── support ────────────────────────────────────────────────────────────────

export async function createTicket(subject: string, body: string): Promise<Result<{ id: string }>> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  if (!subject.trim()) return { ok: false, error: "Give your ticket a subject." };
  if (!body.trim()) return { ok: false, error: "Describe the problem so we can help." };

  const db = getSupabaseAdmin();
  const { data: ticket, error } = await db
    .from("panel_tickets")
    .insert({ user_id: user.id, subject: subject.trim().slice(0, 200) })
    .select("id")
    .single();
  if (error || !ticket) return { ok: false, error: "Could not open the ticket." };

  await db.from("panel_ticket_messages").insert({
    ticket_id: ticket.id,
    author_id: user.id,
    is_staff: false,
    body: body.trim().slice(0, 4000),
  });

  revalidatePath("/panel/tickets");
  return { ok: true, data: { id: ticket.id } };
}

export async function replyToTicket(ticketId: string, body: string): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  if (!body.trim()) return { ok: false, error: "Write a reply first." };

  const db = getSupabaseAdmin();
  const { data: ticket } = await db
    .from("panel_tickets")
    .select("id, user_id")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket) return { ok: false, error: "That ticket no longer exists." };
  if (!user.isAdmin && ticket.user_id !== user.id) return { ok: false, error: "That isn't your ticket." };

  await db.from("panel_ticket_messages").insert({
    ticket_id: ticketId,
    author_id: user.id,
    is_staff: user.isAdmin,
    body: body.trim().slice(0, 4000),
  });
  await db
    .from("panel_tickets")
    .update({ status: user.isAdmin ? "answered" : "open" })
    .eq("id", ticketId);

  revalidatePath(`/panel/tickets/${ticketId}`);
  revalidatePath("/panel/tickets");
  return { ok: true };
}

// ── profile ────────────────────────────────────────────────────────────────

/**
 * Change the display name.
 *
 * There's one account, so this writes public.users.name — the same name the
 * shop shows. That's the point of sharing the account; a panel-only alias
 * would just be a second thing to keep in sync.
 */
export async function updateProfileName(fullName: string): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { error } = await getSupabaseAdmin()
    .from("users")
    .update({ name: fullName.trim().slice(0, 160) || null })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/panel/settings");
  return { ok: true };
}

/** Issue (or replace) the reseller API key. Shown once on generation; only the
 *  value in the database is authoritative. */
export async function regenerateApiKey(): Promise<Result<{ apiKey: string }>> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const apiKey = `sk_${crypto.randomUUID().replace(/-/g, "")}`;
  const { error } = await getSupabaseAdmin()
    .from("panel_profiles")
    .update({ api_key: apiKey })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/panel/settings");
  return { ok: true, data: { apiKey } };
}

// ── session ────────────────────────────────────────────────────────────────

export async function panelSignOut(): Promise<void> {
  const { signOutOfPanel } = await import("@/lib/panel/auth");
  await signOutOfPanel();
  revalidatePath("/panel/dashboard");
}
