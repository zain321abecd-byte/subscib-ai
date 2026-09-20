"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { saleDatesFor, type SaleRequestRow } from "@/lib/product-forms";

/**
 * Sale request review.
 *
 * Accepting creates the subscription_sales row (Daily Sales) and links it back
 * via sale_id, which is also what makes a second accept a no-op instead of a
 * duplicate sale.
 *
 * Uses the service-role client like the rest of the admin writes —
 * requireAdmin() is the authorisation gate, not RLS.
 */

export type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

function bust() {
  revalidatePath("/admin/sale-requests");
  revalidatePath("/admin/sales");
  revalidatePath("/admin");
}

export async function getSaleRequests(): Promise<SaleRequestRow[]> {
  await requireAdmin("sales:read");
  const { data, error } = await getSupabaseAdmin()
    .from("sale_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return [];
  return (data ?? []) as SaleRequestRow[];
}

/**
 * Approve a request: create the sale, then mark the request accepted.
 *
 * Deliberately in that order — if the sale insert fails the request stays
 * pending and can be retried, which is safer than a request marked accepted
 * with no sale behind it.
 */
export async function acceptSaleRequest(id: string): Promise<Result<{ saleId: string }>> {
  const me = await requireAdmin("sales:write");
  if (!id) return { ok: false, error: "Missing request id." };

  const supabase = getSupabaseAdmin();

  const { data: row, error: readError } = await supabase
    .from("sale_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (readError) return { ok: false, error: readError.message };
  if (!row) return { ok: false, error: "That request no longer exists." };

  const request = row as SaleRequestRow;
  if (request.status === "accepted" && request.sale_id) {
    return { ok: false, error: `Already accepted — sale ${request.request_no ?? ""} is in Daily Sales.` };
  }

  const dates = saleDatesFor(request.plan_duration);

  const { data: sale, error: saleError } = await supabase
    .from("subscription_sales")
    .insert({
      customer_name: request.customer_name,
      customer_email: request.customer_email,
      customer_phone: request.customer_phone,
      // Only set when the form was linked to a catalog product; the FK would
      // reject an id that isn't in products.
      product_id: request.product_id,
      product_name: request.product_name,
      plan_name: request.plan_label,
      sale_price: request.price,
      currency: request.currency || "PKR",
      sale_date: dates.sale_date,
      expiry_date: dates.expiry_date,
      renew_date: dates.renew_date,
      // A one-time purchase has no next cycle, so it goes in terminal —
      // otherwise the renewal sweep would chase the customer about a
      // subscription they never bought.
      status: dates.recurring ? "active" : "renewed",
      notes: [
        `From request ${request.request_no ?? id}`,
        dates.recurring ? null : "One-time purchase — no renewal.",
      ].filter(Boolean).join(" · "),
    })
    .select("id")
    .single();

  if (saleError || !sale) {
    return { ok: false, error: saleError?.message || "Could not create the sale." };
  }

  const { error: updateError } = await supabase
    .from("sale_requests")
    .update({
      status: "accepted",
      sale_id: sale.id,
      decline_reason: null,
      reviewed_by: me.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    // The sale exists; say so rather than implying nothing happened.
    return {
      ok: false,
      error: `The sale was created but the request couldn't be marked accepted: ${updateError.message}`,
    };
  }

  bust();
  return { ok: true, data: { saleId: sale.id } };
}

export async function declineSaleRequest(id: string, reason: string): Promise<Result> {
  const me = await requireAdmin("sales:write");
  if (!id) return { ok: false, error: "Missing request id." };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sale_requests")
    .update({
      status: "declined",
      decline_reason: reason.trim().slice(0, 500) || null,
      reviewed_by: me.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .neq("status", "accepted") // an accepted request has a sale behind it
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "That request was already accepted, so it can't be declined." };

  bust();
  return { ok: true };
}

/** Put a declined request back in the queue. */
export async function reopenSaleRequest(id: string): Promise<Result> {
  await requireAdmin("sales:write");
  if (!id) return { ok: false, error: "Missing request id." };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sale_requests")
    .update({ status: "pending", decline_reason: null, reviewed_by: null, reviewed_at: null })
    .eq("id", id)
    .eq("status", "declined")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Only a declined request can be reopened." };

  bust();
  return { ok: true };
}
