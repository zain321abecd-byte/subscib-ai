import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/panel/ui";
import type { Provider, Service, ServiceCategory } from "@/lib/panel/types";
import AddedServicesManager from "./AddedServicesManager";

export const metadata: Metadata = { title: "Added services" };
export const dynamic = "force-dynamic";

export default async function AddedServicesPage() {
  const db = getSupabaseAdmin();
  const [{ data: services }, { data: categories }, { data: providers }] = await Promise.all([
    db.from("panel_services").select("*").order("sort_order").order("name").limit(2000),
    db.from("panel_service_categories").select("*").order("sort_order").order("name"),
    db.from("panel_providers").select("id, name, api_url, balance, currency, active, last_synced_at, last_error, created_at").order("name"),
  ]);

  return (
    <>
      <PageHeader title="Added services" subtitle="Services currently available in the customer panel. Select any group and update its profit margin together." />
      <AddedServicesManager
        services={(services ?? []) as Service[]}
        categories={(categories ?? []) as ServiceCategory[]}
        providers={(providers ?? []) as Provider[]}
      />
    </>
  );
}
