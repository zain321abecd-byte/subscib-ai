import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import CustomerContactsClient, { type CustomerContact } from "./CustomerContactsClient";
import type { OrderRow } from "@/lib/supabase/types";

export const metadata = { title: "Customer contacts" };

export const dynamic = "force-dynamic";

const PAID_STATUSES = new Set(["paid", "delivered"]);

function cleanEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function cleanPhone(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sourceLabel(order: Pick<OrderRow, "utm_source" | "utm_medium" | "utm_campaign" | "referrer">) {
  if (order.utm_campaign) return order.utm_campaign;
  if (order.utm_source && order.utm_medium) return `${order.utm_source} / ${order.utm_medium}`;
  if (order.utm_source) return order.utm_source;
  if (order.referrer) {
    try {
      return new URL(order.referrer).hostname;
    } catch {
      return "referral";
    }
  }
  return "direct";
}

function buildContacts(orders: OrderRow[]): CustomerContact[] {
  const contacts = new Map<string, CustomerContact>();

  for (const order of orders) {
    const email = cleanEmail(order.customer_email);
    if (!email) continue;

    const existing = contacts.get(email);
    const phone = cleanPhone(order.customer_phone);
    const paid = PAID_STATUSES.has(order.status);

    if (!existing) {
      contacts.set(email, {
        email,
        name: order.customer_name?.trim() || "",
        phones: phone ? [phone] : [],
        orderCount: 1,
        paidOrderCount: paid ? 1 : 0,
        latestOrderAt: order.created_at,
        firstOrderAt: order.created_at,
        lastOrderNumber: order.order_number,
        lastStatus: order.status,
        source: sourceLabel(order),
      });
      continue;
    }

    existing.orderCount += 1;
    if (paid) existing.paidOrderCount += 1;
    if (!existing.name && order.customer_name?.trim()) existing.name = order.customer_name.trim();
    if (phone && !existing.phones.includes(phone)) existing.phones.push(phone);
    if (new Date(order.created_at).getTime() > new Date(existing.latestOrderAt).getTime()) {
      existing.latestOrderAt = order.created_at;
      existing.lastOrderNumber = order.order_number;
      existing.lastStatus = order.status;
      existing.source = sourceLabel(order);
    }
    if (new Date(order.created_at).getTime() < new Date(existing.firstOrderAt).getTime()) {
      existing.firstOrderAt = order.created_at;
    }
  }

  return [...contacts.values()].sort(
    (a, b) => new Date(b.latestOrderAt).getTime() - new Date(a.latestOrderAt).getTime(),
  );
}

export default async function CustomerContactsPage() {
  await requireAdmin("orders:read");

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .select("id,order_number,customer_email,customer_phone,customer_name,status,utm_source,utm_medium,utm_campaign,referrer,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  const contacts = buildContacts((data ?? []) as OrderRow[]);

  return (
    <>
      <header className="admin-page-head">
        <div>
          <h1>Customer Contacts</h1>
          <p>Collect checkout emails and customer numbers from guest and logged-in orders for promotions and follow-up.</p>
        </div>
      </header>

      {error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5", marginBottom: 14 }}>
          {error.message}
        </div>
      )}

      <CustomerContactsClient contacts={contacts} />
    </>
  );
}
