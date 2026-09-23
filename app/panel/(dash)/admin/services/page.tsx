import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/panel/ui";
import type { Provider, Service, ServiceCategory } from "@/lib/panel/types";
import ServiceManager from "./ServiceManager";

export const metadata: Metadata = { title: "Manage services" };
export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const db = getSupabaseAdmin();

  // Admins need to see inactive rows too, which the public catalog policy hides.
  const [{ data: services }, { data: categories }, { data: providers }] = await Promise.all([
    db.from("panel_services").select("*").order("sort_order").order("name").limit(500),
    db.from("panel_service_categories").select("*").order("sort_order").order("name"),
    db.from("panel_providers").select("id, name, api_url, balance, currency, active, last_synced_at, last_error, created_at").order("name"),
  ]);

  return (
    <>
      <PageHeader
        title="Manage services"
        subtitle="The catalog customers order from. Rates here are what they pay; the provider rate is what you pay."
      />
      <ServiceManager
        services={(services ?? []) as Service[]}
        categories={(categories ?? []) as ServiceCategory[]}
        providers={(providers ?? []) as Provider[]}
      />
    </>
  );
}
