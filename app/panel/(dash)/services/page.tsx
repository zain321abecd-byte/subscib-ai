import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requirePanelUser } from "@/lib/panel/auth";
import { PLATFORM_LABELS, type Service, type ServiceCategory } from "@/lib/panel/types";
import { Badge, EmptyState, LinkButton, PageHeader, TableWrap, Td, Th } from "@/components/panel/ui";

export const metadata: Metadata = { title: "Services" };
export const dynamic = "force-dynamic";

/** The catalog a customer can order from. Inactive rows are filtered out in
 *  the query, not hidden in the markup. */
export default async function ServicesPage() {
  const db = getSupabaseAdmin();

  const [{ data: categories }, { data: services }] = await Promise.all([
    db.from("panel_service_categories").select("*").eq("active", true).order("sort_order").order("name"),
    db.from("panel_services").select("*").eq("active", true).order("sort_order").order("name"),
  ]);

  const cats = (categories ?? []) as ServiceCategory[];
  const list = (services ?? []) as Service[];
  const currency = "PKR";

  if (list.length === 0) {
    return (
      <>
        <PageHeader title="Services" subtitle="Everything you can order, with live pricing." />
        <EmptyState
          title="No services yet"
          body="Once an administrator adds services to the catalog they'll appear here with their rates and limits."
        />
      </>
    );
  }

  const byCategory = cats
    .map((c) => ({ category: c, items: list.filter((s) => s.category_id === c.id) }))
    .filter((g) => g.items.length > 0);

  const uncategorised = list.filter((s) => !s.category_id || !cats.some((c) => c.id === s.category_id));
  if (uncategorised.length > 0) {
    byCategory.push({
      category: { id: "none", name: "Other services", platform: "other", sort_order: 999, active: true },
      items: uncategorised,
    });
  }

  return (
    <>
      <PageHeader
        title="Services"
        subtitle={`${list.length} service${list.length === 1 ? "" : "s"} available. Rates are per 1,000 units.`}
        action={<LinkButton href="/panel/orders/new">Place an order</LinkButton>}
      />

      <div className="grid gap-5">
        {byCategory.map(({ category, items }) => (
          <section key={category.id}>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-sm font-bold text-[var(--text)]">{category.name}</h2>
              <Badge tone="info">{PLATFORM_LABELS[category.platform] ?? category.platform}</Badge>
            </div>

            <TableWrap>
              <thead>
                <tr>
                  <Th>Service</Th>
                  <Th align="right">Rate / 1000</Th>
                  <Th align="right">Min</Th>
                  <Th align="right">Max</Th>
                  <Th>Speed</Th>
                  <Th align="right" />
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id}>
                    <Td>
                      <div className="font-medium text-[var(--text)]">{s.name}</div>
                      {s.description && (
                        <div className="mt-0.5 max-w-lg text-xs text-[var(--text-muted)]">{s.description}</div>
                      )}
                    </Td>
                    <Td align="right" className="whitespace-nowrap font-semibold text-[var(--text)]">
                      {Number(s.rate_per_1000).toLocaleString("en-PK", { minimumFractionDigits: 2 })} {currency}
                    </Td>
                    <Td align="right" className="whitespace-nowrap text-[var(--text-muted)]">
                      {s.min_quantity.toLocaleString()}
                    </Td>
                    <Td align="right" className="whitespace-nowrap text-[var(--text-muted)]">
                      {s.max_quantity.toLocaleString()}
                    </Td>
                    <Td className="whitespace-nowrap text-[var(--text-muted)]">{s.speed || "—"}</Td>
                    <Td align="right">
                      <a
                        href={`/panel/orders/new?service=${s.id}`}
                        className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
                      >
                        Order
                      </a>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </section>
        ))}
      </div>
    </>
  );
}
