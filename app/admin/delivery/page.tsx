import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSiteSettings } from "@/lib/site-settings";
import { getDeliveryStatus, getOrderPrefill, getTemplates } from "./actions";
import DeliveryComposer from "./DeliveryComposer";

export const metadata = { title: "Delivery automation" };
export const dynamic = "force-dynamic";

/**
 * Compose screen entry point. Gates on `delivery:read` (sending needs
 * `delivery:send`, which the composer enforces on the button), then loads the
 * templates, the product catalog, the provider status, and — when the admin
 * arrived from an order via ?order=<id> — that order's customer + items.
 */
export default async function DeliveryPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const me = await requireAdmin("delivery:read");
  const { order } = await searchParams;

  const [templates, productsRes, status, settings, prefill] = await Promise.all([
    getTemplates(),
    getSupabaseAdmin().from("products").select("id, name").order("name", { ascending: true }),
    getDeliveryStatus(),
    getSiteSettings(),
    order ? getOrderPrefill(order) : Promise.resolve(null),
  ]);

  const products = (productsRes.data as Array<{ id: string; name: string }> | null) ?? [];

  return (
    <div style={{ padding: "24px 28px" }}>
      <DeliveryComposer
        templates={templates}
        products={products}
        status={status}
        brand={{
          supportEmail: settings.contact_email || "",
          supportWhatsapp: settings.whatsapp_number || "",
          brandName: settings.business_name || "SubscribAI",
        }}
        canSend={me.isSuper || me.effectivePermissions.includes("delivery:send")}
        canManageTemplates={me.isSuper || me.effectivePermissions.includes("delivery:templates")}
        prefill={prefill}
      />
    </div>
  );
}
