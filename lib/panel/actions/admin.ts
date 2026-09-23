"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getPanelUser } from "@/lib/panel/auth";

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
    .select("id, user_id, amount, status")
    .eq("id", id)
    .maybeSingle();

  if (!request) return { ok: false, error: "That request no longer exists." };
  if (request.status !== "pending") return { ok: false, error: `Already ${request.status}.` };

  let transactionId: string | null = null;

  if (decision === "approved") {
    const { data: tx, error } = await db
      .from("panel_wallet_transactions")
      .insert({
        user_id: request.user_id,
        type: "credit",
        amount: request.amount,
        note: "Wallet top-up approved",
        created_by: admin.id,
      })
      .select("id")
      .single();
    if (error || !tx) return { ok: false, error: "Could not credit the wallet. Nothing was changed." };
    transactionId = tx.id;
  }

  const { error: updateError } = await db
    .from("panel_payment_requests")
    .update({
      status: decision,
      admin_note: adminNote?.trim().slice(0, 500) || null,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      transaction_id: transactionId,
    })
    .eq("id", id)
    .eq("status", "pending");

  if (updateError) {
    return {
      ok: false,
      error:
        decision === "approved"
          ? "The wallet was credited but the request could not be marked approved — check before approving again."
          : updateError.message,
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

  const db = getSupabaseAdmin();
  const { data: provider } = await db
    .from("panel_providers")
    .select("api_url, api_key")
    .eq("id", id)
    .maybeSingle();
  if (!provider) return { ok: false, error: "That provider no longer exists." };

  try {
    const res = await fetch(provider.api_url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ key: provider.api_key, action: "balance" }),
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await res.json().catch(() => ({}) as Record<string, unknown>);

    if (!res.ok || payload?.error) {
      const detail = String(payload?.error || `HTTP ${res.status}`);
      await db.from("panel_providers").update({ last_error: detail.slice(0, 300) }).eq("id", id);
      return { ok: false, error: detail };
    }

    const balance = String(payload?.balance ?? "0");
    await db
      .from("panel_providers")
      .update({
        balance: Number(balance) || 0,
        currency: String(payload?.currency || "USD"),
        last_synced_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", id);

    revalidatePath("/panel/admin/providers");
    return { ok: true, data: { balance } };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unreachable";
    await db.from("panel_providers").update({ last_error: detail.slice(0, 300) }).eq("id", id);
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
  revalidatePath("/panel");
}
