"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteServices, importProviderServices, updateServiceMargins } from "@/lib/panel/actions/admin";
import { Badge, EmptyState, TableWrap, Td, Th } from "@/components/panel/ui";
import type { ProviderCatalogService } from "@/lib/panel/types";

export default function ProviderCatalog({ services, error }: { services: ProviderCatalogService[]; error?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [margin, setMargin] = useState(30);
  const [toolbarFixed, setToolbarFixed] = useState(false);
  const toolbarSentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = toolbarSentinel.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setToolbarFixed(!entry.isIntersecting && entry.boundingClientRect.top < 76),
      { root: null, rootMargin: "-76px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q
      ? services.filter((s) => `${s.service} ${s.name} ${s.category} ${s.provider_name}`.toLowerCase().includes(q))
      : services;
  }, [filter, services]);
  const keyOf = (s: ProviderCatalogService) => `${s.provider_id}:${s.service}`;
  const allVisibleSelected = visible.length > 0 && visible.every((s) => selected.has(keyOf(s)));
  const selectedRows = services.filter((s) => selected.has(keyOf(s)));
  const selectedMissing = selectedRows.filter((s) => !s.imported_service_id);
  const selectedAdded = selectedRows.filter((s) => s.imported_service_id);

  function toggleAll() {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visible.forEach((s) => next.delete(keyOf(s)));
      else visible.forEach((s) => next.add(keyOf(s)));
      return next;
    });
  }

  function addSelected() {
    setMessage(null);
    start(async () => {
      const queue = selectedMissing.map((s) => ({ providerId: s.provider_id, serviceId: s.service }));
      setImportProgress({ done: 0, total: queue.length });
      const result = await importProviderServices(queue, margin);
      if (!result.ok) {
        setImportProgress(null);
        setMessage(`${result.error} You can retry safely; completed services will be skipped.`);
        router.refresh();
        return;
      }

      setImportProgress(null);
      const added = result.data?.added ?? 0;
      const skipped = result.data?.skipped ?? 0;
      setMessage(`${added} services added${skipped ? `, ${skipped} already added or skipped` : ""}.`);
      setSelected(new Set());
      router.refresh();
    });
  }

  function applyMargin() {
    setMessage(null);
    start(async () => {
      const result = await updateServiceMargins(
        selectedAdded.flatMap((service) => service.imported_service_id ? [service.imported_service_id] : []),
        margin,
      );
      if (!result.ok) return setMessage(result.error);
      setMessage(`Margin updated to ${margin}% for ${result.data?.updated ?? 0} services.`);
      router.refresh();
    });
  }

  function removeSelected() {
    if (!window.confirm(`Delete ${selectedAdded.length} selected service${selectedAdded.length === 1 ? "" : "s"} from your panel?`)) return;
    setMessage(null);
    start(async () => {
      const result = await deleteServices(selectedAdded.flatMap((s) => s.imported_service_id ? [s.imported_service_id] : []));
      if (!result.ok) return setMessage(result.error);
      setMessage(`${result.data?.deleted ?? 0} services deleted.`);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <section className="grid gap-3">
      <div>
        <h2 className="text-lg font-bold text-[var(--text)]">Provider services</h2>
        <p className="text-sm text-[var(--text-muted)]">The complete live provider catalog. Select rows to add or delete many at once.</p>
      </div>
      <div ref={toolbarSentinel} aria-hidden="true" className="h-px" />
      {toolbarFixed && <div aria-hidden="true" className="h-[68px]" />}
      <div className={`${toolbarFixed
        ? "fixed left-3 right-3 top-[72px] z-40 md:left-[284px] md:right-6 md:top-[76px]"
        : "relative z-20 -mx-1"
      } flex flex-wrap items-center gap-2 overflow-hidden rounded-2xl border border-orange-500/30 bg-[var(--surface)] p-2.5 shadow-[0_18px_55px_rgba(255,90,31,0.18)] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-orange-500`}>
        <div className="hidden shrink-0 items-center gap-2 pl-1 lg:flex">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/25">✓</span>
          <div className="leading-tight"><p className="text-xs font-bold text-[var(--text)]">Service selection</p><p className="text-[10px] text-[var(--text-muted)]">Bulk catalog actions</p></div>
        </div>
        <input className="panel-input min-w-[220px] flex-1 lg:max-w-md" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search ID, service, category or provider" />
        <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-bold text-[var(--text-muted)]">
          Margin
          <input aria-label="Profit margin percent" className="w-14 bg-transparent text-right text-sm font-bold text-[var(--text)] outline-none" type="number" min={1} max={100} value={margin} onChange={(event) => setMargin(Math.min(100, Math.max(1, Number(event.target.value) || 1)))} />
          %
        </label>
        <button className="panel-btn panel-btn-primary min-w-[148px]" type="button" disabled={pending || !selectedMissing.length} onClick={addSelected}>
          {importProgress ? `Adding ${importProgress.done}/${importProgress.total}` : pending ? "Working…" : `Add selected (${selectedMissing.length})`}
        </button>
        <button className="panel-btn panel-btn-ghost text-red-600 dark:text-red-400" type="button" disabled={pending || !selectedAdded.length} onClick={removeSelected}>
          {pending ? "Working…" : `Delete selected (${selectedAdded.length})`}
        </button>
        <button className="panel-btn panel-btn-ghost" type="button" disabled={pending || !selectedAdded.length} onClick={applyMargin}>
          Update margin ({selectedAdded.length})
        </button>
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-bold text-[var(--text-muted)]">{selected.size} selected · {visible.length}/{services.length}</span>
      </div>
      {importProgress && (
        <div className="overflow-hidden rounded-full bg-[var(--surface-3)]" role="progressbar" aria-valuemin={0} aria-valuemax={importProgress.total} aria-valuenow={importProgress.done}>
          <div className="h-2 rounded-full bg-orange-500 transition-[width] duration-300" style={{ width: `${Math.max(3, (importProgress.done / importProgress.total) * 100)}%` }} />
        </div>
      )}
      {(message || error) && (
        <p role="status" className={`rounded-lg border px-3 py-2 text-sm ${error || message?.toLowerCase().includes("could not") ? "border-red-300 text-red-600" : "border-[var(--border)] text-[var(--text-muted)]"}`}>
          {message || error}
        </p>
      )}
      {!services.length ? (
        <EmptyState title="No provider services available" body="Check that the provider is active and its API connection is working." />
      ) : (
        <TableWrap>
          <thead><tr>
            <Th><input type="checkbox" aria-label="Select all visible provider services" checked={allVisibleSelected} onChange={toggleAll} /></Th>
            <Th>ID</Th><Th>Service</Th><Th>Category</Th><Th align="right">Provider rate</Th><Th align="right">Min — Max</Th><Th>Status</Th>
          </tr></thead>
          <tbody>{visible.map((s) => {
            const key = keyOf(s);
            return <tr key={key}>
              <Td><input type="checkbox" aria-label={`Select ${s.name}`} checked={selected.has(key)} onChange={() => setSelected((current) => { const next = new Set(current); next.has(key) ? next.delete(key) : next.add(key); return next; })} /></Td>
              <Td className="whitespace-nowrap text-[var(--text-muted)]">{s.service}</Td>
              <Td><div className="font-medium text-[var(--text)]">{s.name}</div><div className="text-xs text-[var(--text-muted)]">{s.provider_name} · {s.type}</div></Td>
              <Td className="text-[var(--text-muted)]">{s.category}</Td>
              <Td align="right" className="whitespace-nowrap">{s.rate.toLocaleString(undefined, { maximumFractionDigits: 4 })} {s.currency}</Td>
              <Td align="right" className="whitespace-nowrap text-[var(--text-muted)]">{s.min.toLocaleString()} — {s.max.toLocaleString()}</Td>
              <Td>{s.imported_service_id ? <Badge tone="ok">Added</Badge> : <Badge>Not added</Badge>}</Td>
            </tr>;
          })}</tbody>
        </TableWrap>
      )}
    </section>
  );
}
