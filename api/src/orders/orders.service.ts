import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

type ItemInput = {
  id: string;
  name: string;
  qty: number;
  price: number;
  variation?: Record<string, unknown>;
};

const VALID_STATUSES = ["pending", "paid", "delivered", "failed", "refunded", "cancelled"] as const;
type Status = (typeof VALID_STATUSES)[number];

function shortOrderNumber(): string {
  const y = new Date();
  const ym = `${y.getUTCFullYear().toString().slice(2)}${String(y.getUTCMonth() + 1).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SAI-${ym}-${rand}`;
}

function isValidEmail(s: unknown): s is string {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

@Injectable()
export class OrdersService {
  constructor(private readonly supabase: SupabaseService) {}

  /** Record a new order. `accessToken` (optional) ties it to a logged-in user. */
  async create(body: any, accessToken?: string) {
    const items: ItemInput[] = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) throw new BadRequestException("No items");
    if (!isValidEmail(body?.customer_email)) throw new BadRequestException("Invalid email");

    const subtotalPkr = items.reduce((s, i) => s + Number(i.price) * Number(i.qty || 1), 0);
    const subtotalUsd =
      typeof body.subtotal_usd === "number" && body.subtotal_usd > 0 ? body.subtotal_usd : null;

    const order_number = shortOrderNumber();
    const cleanStr = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 500) : null);

    // Resolve the caller from their token — never trust a client-supplied user_id.
    const user = await this.supabase.getUser(accessToken);
    const userId = user?.id ?? null;

    const { data, error } = await this.supabase
      .admin()
      .from("orders")
      .insert({
        order_number,
        user_id: userId,
        customer_email: String(body.customer_email).trim().toLowerCase(),
        customer_phone: typeof body.customer_phone === "string" ? body.customer_phone.trim() : null,
        customer_name: typeof body.customer_name === "string" ? body.customer_name.trim() : null,
        items,
        subtotal_usd: subtotalUsd != null ? subtotalUsd.toFixed(2) : null,
        subtotal_pkr: typeof body.subtotal_pkr === "number" ? body.subtotal_pkr : subtotalPkr,
        status: "pending",
        payment_method: typeof body.payment_method === "string" ? body.payment_method : null,
        transaction_id: typeof body.transaction_id === "string" ? body.transaction_id : null,
        utm_source: cleanStr(body.utm_source),
        utm_medium: cleanStr(body.utm_medium),
        utm_campaign: cleanStr(body.utm_campaign),
        referrer: cleanStr(body.referrer),
        landing_page: cleanStr(body.landing_page),
        package_tier: cleanStr(body.package_tier),
      })
      .select("id, order_number")
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    return { ok: true, id: data.id, order_number: data.order_number, stored: true };
  }

  /**
   * Advance an order. Matches by uuid id or order_number. Limited to the fields
   * the SahulatPay callback / admin may mutate.
   */
  async update(idOrNumber: string, body: any) {
    const update: Record<string, unknown> = {};
    if (typeof body.status === "string" && VALID_STATUSES.includes(body.status as Status)) {
      update.status = body.status;
      if (body.status === "delivered") update.delivered_at = new Date().toISOString();
    }
    if (typeof body.transaction_id === "string") update.transaction_id = body.transaction_id;
    if (typeof body.notes === "string") update.notes = body.notes;
    if (Object.keys(update).length === 0) throw new BadRequestException("No valid fields to update");

    const isUuid = /^[0-9a-f-]{36}$/i.test(idOrNumber);
    const filterCol = isUuid ? "id" : "order_number";

    const { data, error } = await this.supabase
      .admin()
      .from("orders")
      .update(update as never)
      .eq(filterCol, idOrNumber)
      .select("id, order_number, status")
      .maybeSingle();

    if (error) throw new InternalServerErrorException(error.message);
    if (!data) throw new NotFoundException("Order not found");
    return { ok: true, order: data };
  }
}
