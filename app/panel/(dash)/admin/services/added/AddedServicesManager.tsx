"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteServices, updateServiceMargins } from "@/lib/panel/actions/admin";
import { Badge, EmptyState, TableWrap, Td, Th } from "@/components/panel/ui";
import type { Provider, Service, ServiceCategory } from "@/lib/panel/types";

export default function AddedServicesManager({ services, categories, providers }: {
  services: Service[];
  categories: ServiceCategory[];
  providers: Provider[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [margin, setMargin] = useState(30);
  const [message, setMessage] = useState<string | null>(null);
  const categoryNames = useMemo(() => new Map(categories.map((item) => [item.id, item.name])), [categories]);
  const providerNames = useMemo(() => new Map(providers.map((item) => [item.id, item.name])), [providers]);
  const visible = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return query ? services.filter((service) => `${service.name} ${service.provider_service_id || ""} ${categoryNames.get(service.category_id || "") || ""}`.toLowerCase().includes(query)) : services;
  }, [services, filter, categoryNames]);
  const allVisibleSelected = visible.length > 0 && visible.every((service) => selected.has(service.id));

  function toggleAll() {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visible.forEach((service) => next.delete(service.id));
      else visible.forEach((service) => next.add(service.id));
      return next;
    });
  }

  function updateMargin() {
    setMessage(null);
    start(async () => {
      const result = await updateServiceMargins([...selected], margin);
      if (!result.ok) return setMessage(result.error);
      setMessage(`Updated ${result.data?.updated ?? 0} services to a ${margin}% margin.`);
      router.refresh();
    });
  }

  function removeSelected() {
    if (!window.confirm(`Delete ${selected.size} selected services from the customer panel?`)) return;
    setMessage(null);
    start(async () => {
      const result = await deleteServices([...selected]);
      if (!result.ok) return setMessage(result.error);
      setMessage(`Deleted ${result.data?.deleted ?? 0} services.`);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <section className="grid gap-4">
      <div className="sticky top-[76px] z-30 flex flex-wrap items-center gap-2 rounded-2xl border border-orange-500/30 bg-[var(--surface)] p-3 shadow-xl">
        <input className="panel-input min-w-[220px] flex-1" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search added services" />
        <button type="button" className="panel-btn panel-btn-ghost" onClick={toggleAll} disabled={!visible.length}>
          {allVisibleSelected ? "Clear visible" : `Select all (${visible.length})`}
        </button>
        <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold">
          Margin
          <input className="w-14 bg-transparent text-right outline-none" type="number" min={1} max={100} value={margin} onChange={(event) => setMargin(Math.min(100, Math.max(1, Number(event.target.value) || 1)))} />%
        </label>
        <button type="button" className="panel-btn panel-btn-primary" disabled={pending || !selected.size} onClick={updateMargin}>
          {pending ? "Updating…" : `Update margin (${selected.size})`}
        </button>
        <button type="button" className="panel-btn panel-btn-ghost text-red-600" disabled={pending || !selected.size} onClick={removeSelected}>Delete ({selected.size})</button>
      </div>
      {message && <p role="status" className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-muted)]">{message}</p>}
      {!services.length ? <EmptyState title="No added services" body="Add services from Provider services and they will appear here." /> : (
        <TableWrap>
          <thead><tr><Th><input type="checkbox" aria-label="Select all visible added services" checked={allVisibleSelected} onChange={toggleAll} /></Th><Th>Service</Th><Th>Category</Th><Th align="right">Customer rate</Th><Th align="right">Limits</Th><Th>Provider</Th><Th>Status</Th></tr></thead>
          <tbody>{visible.map((service) => <tr key={service.id}>
            <Td><input type="checkbox" aria-label={`Select ${service.name}`} checked={selected.has(service.id)} onChange={() => setSelected((current) => { const next = new Set(current); next.has(service.id) ? next.delete(service.id) : next.add(service.id); return next; })} /></Td>
            <Td><div className="font-medium text-[var(--text)]">{service.name}</div><div className="text-xs text-[var(--text-muted)]">Provider ID: {service.provider_service_id || "manual"}</div></Td>
            <Td className="text-[var(--text-muted)]">{categoryNames.get(service.category_id || "") || "—"}</Td>
            <Td align="right" className="whitespace-nowrap font-semibold">Rs {Number(service.rate_per_1000).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</Td>
            <Td align="right" className="whitespace-nowrap text-[var(--text-muted)]">{service.min_quantity.toLocaleString()} — {service.max_quantity.toLocaleString()}</Td>
            <Td className="text-[var(--text-muted)]">{service.provider_id ? providerNames.get(service.provider_id) || "Unknown" : "Manual"}</Td>
            <Td><Badge tone={service.active ? "ok" : "neutral"}>{service.active ? "Active" : "Hidden"}</Badge></Td>
          </tr>)}</tbody>
        </TableWrap>
      )}
    </section>
  );
}
