import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PickableCustomer } from "@/lib/whatsapp-templates";
import WhatsAppSendClient from "./WhatsAppSendClient";

export const metadata = { title: "Send by WhatsApp" };
export const dynamic = "force-dynamic";

/** Most recent contacts offered in the picker. Enough to find someone, small
 *  enough to stay a dropdown rather than a search screen. */
const PICKER_LIMIT = 150;

function digits(value: unknown): string {
  return typeof value === "string" ? value.replace(/\D+/g, "") : "";
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Build the optional customer list from the two places this shop records a
 * phone number: orders and tracked subscription sales. Deduped on the
 * normalized number, newest first — the same shape as the contact list on
 * /admin/customer-contacts, which dedupes orders by email.
 */
async function loadCustomers(): Promise<PickableCustomer[]> {
  const supabase = getSupabaseAdmin();

  const [ordersRes, salesRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_phone, customer_email, items, created_at")
      .not("customer_phone", "is", null)
      .order("created_at", { ascending: false })
      .limit(PICKER_LIMIT),
    supabase
      .from("subscription_sales")
      .select("id, customer_name, customer_phone, customer_email, product_name, created_at")
      .order("created_at", { ascending: false })
      .limit(PICKER_LIMIT),
  ]);

  const byPhone = new Map<string, PickableCustomer>();

  const add = (candidate: PickableCustomer) => {
    const key = digits(candidate.phone);
    if (!key || byPhone.has(key)) return; // first (newest) wins
    byPhone.set(key, candidate);
  };

  for (const row of (salesRes.data ?? []) as any[]) {
    const phone = text(row.customer_phone);
    if (!phone) continue;
    add({
      id: `sale-${row.id}`,
      name: text(row.customer_name) || phone,
      phone,
      email: text(row.customer_email) || null,
      product: text(row.product_name) || null,
      orderNumber: null,
      hint: [text(row.product_name), phone].filter(Boolean).join(" · "),
    });
  }

  for (const row of (ordersRes.data ?? []) as any[]) {
    const phone = text(row.customer_phone);
    if (!phone) continue;
    const items = Array.isArray(row.items) ? row.items : [];
    const product = text(items[0]?.name) || null;
    add({
      id: `order-${row.id}`,
      name: text(row.customer_name) || text(row.customer_email) || phone,
      phone,
      email: text(row.customer_email) || null,
      product,
      orderNumber: text(row.order_number) || null,
      hint: [product, text(row.order_number), phone].filter(Boolean).join(" · "),
    });
  }

  return [...byPhone.values()];
}

/**
 * Send by WhatsApp — no backend send, no Meta API. Gated on `delivery:read`,
 * the key that already means "may use the WhatsApp sending tools", so this
 * page needs no new permission and no migration to grant one.
 */
export default async function WhatsAppSendPage() {
  await requireAdmin("delivery:read");

  // A missing table or an unconfigured service role shouldn't take the page
  // down — manual entry is the primary path and works without any of this.
  let customers: PickableCustomer[] = [];
  try {
    customers = await loadCustomers();
  } catch {
    customers = [];
  }

  return (
    <div style={{ padding: "24px 28px" }}>
      <WhatsAppSendClient customers={customers} />
    </div>
  );
}
