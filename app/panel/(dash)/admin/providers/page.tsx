import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/panel/ui";
import type { Provider } from "@/lib/panel/types";
import ProviderManager from "./ProviderManager";

export const metadata: Metadata = { title: "Providers" };
export const dynamic = "force-dynamic";

export default async function AdminProvidersPage() {
  const db = getSupabaseAdmin();

  // api_key is deliberately not selected — nothing on this page needs the
  // secret, and not fetching it means it can't end up in the HTML payload.
  const { data } = await db
    .from("panel_providers")
    .select("id, name, api_url, balance, currency, active, last_synced_at, last_error, created_at")
    .order("name");

  const { data: serviceCounts } = await db.from("panel_services").select("provider_id");
  const counts = new Map<string, number>();
  for (const row of serviceCounts ?? []) {
    if (!row.provider_id) continue;
    counts.set(row.provider_id, (counts.get(row.provider_id) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        title="Providers"
        subtitle="The upstream APIs that fulfil orders. Most speak the standard action=add / action=balance dialect."
      />
      <ProviderManager
        providers={(data ?? []) as Provider[]}
        serviceCounts={Object.fromEntries(counts)}
      />
    </>
  );
}
