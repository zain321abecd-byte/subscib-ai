import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/panel/ui";
import type { ProviderCatalogService } from "@/lib/panel/types";
import ProviderCatalog from "./ProviderCatalog";
import { getProviderCatalog, type UpstreamProviderService } from "@/lib/panel/provider-catalog";

export const metadata: Metadata = { title: "Manage services" };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function AdminServicesPage() {
  const db = getSupabaseAdmin();

  // Admins need to see inactive rows too, which the public catalog policy hides.
  const [{ data: services }, { data: providerSecrets }] = await Promise.all([
    db.from("panel_services").select("*").order("sort_order").order("name").limit(1000),
    db.from("panel_providers").select("id, name, currency").eq("active", true),
  ]);

  const imported = new Map(
    (services ?? []).filter((s) => s.provider_id && s.provider_service_id)
      .map((s) => [`${s.provider_id}:${s.provider_service_id}`, s.id]),
  );
  const providerCatalog: ProviderCatalogService[] = [];
  const providerErrors: string[] = [];
  await Promise.all((providerSecrets ?? []).map(async (provider) => {
    try {
      const payload: UpstreamProviderService[] = await getProviderCatalog(provider.id);
      for (const item of payload) {
        const serviceId = String(item.service);
        providerCatalog.push({
          provider_id: provider.id,
          provider_name: provider.name,
          service: serviceId,
          name: String(item.name || `Service ${serviceId}`),
          type: String(item.type || "Default"),
          category: String(item.category || "Other services"),
          rate: Number(item.rate) || 0,
          min: Number(item.min) || 0,
          max: Number(item.max) || 0,
          currency: provider.currency || "USD",
          imported_service_id: imported.get(`${provider.id}:${serviceId}`) || null,
        });
      }
    } catch (error) {
      providerErrors.push(`${provider.name}: ${error instanceof Error ? error.message : "unavailable"}`);
    }
  }));
  providerCatalog.sort((a, b) => a.category.localeCompare(b.category) || Number(a.service) - Number(b.service));

  return (
    <>
      <PageHeader
        title="Manage services"
        subtitle="The catalog customers order from. Rates here are what they pay; the provider rate is what you pay."
      />
      <ProviderCatalog services={providerCatalog} error={providerErrors.length ? providerErrors.join(" · ") : undefined} />
    </>
  );
}
