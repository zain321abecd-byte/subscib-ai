import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requirePanelUser } from "@/lib/panel/auth";
import { PageHeader } from "@/components/panel/ui";
import type { Service, ServiceCategory } from "@/lib/panel/types";
import NewOrderForm from "./NewOrderForm";

export const metadata: Metadata = { title: "New order" };
export const dynamic = "force-dynamic";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { service } = await searchParams;
  const user = await requirePanelUser();
  const db = getSupabaseAdmin();

  const [{ data: services }, { data: categories }, { data: wallet }] = await Promise.all([
    db.from("panel_services").select("*").eq("active", true).order("sort_order").order("name"),
    db.from("panel_service_categories").select("*").eq("active", true).order("sort_order").order("name"),
    db.from("panel_wallets").select("balance, currency").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <>
      <PageHeader title="New order" subtitle="Pick a service, paste the link, choose a quantity." />
      <NewOrderForm
        services={(services ?? []) as Service[]}
        categories={(categories ?? []) as ServiceCategory[]}
        balance={Number(wallet?.balance ?? 0)}
        currency={wallet?.currency ?? "PKR"}
        initialServiceId={service}
      />
    </>
  );
}
