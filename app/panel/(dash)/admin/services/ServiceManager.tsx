"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteService, saveCategory, saveService, type ServiceInput } from "@/lib/panel/actions/admin";
import { Badge, EmptyState, TableWrap, Td, Th } from "@/components/panel/ui";
import { PLATFORM_LABELS, type Platform, type Provider, type Service, type ServiceCategory } from "@/lib/panel/types";

const BLANK: ServiceInput = {
  name: "",
  category_id: null,
  description: "",
  rate_per_1000: 0,
  min_quantity: 100,
  max_quantity: 100000,
  speed: "",
  active: true,
  provider_id: null,
  provider_service_id: "",
  provider_rate: null,
};

export default function ServiceManager({
  services, categories, providers,
}: {
  services: Service[];
  categories: ServiceCategory[];
  providers: Provider[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const [catName, setCatName] = useState("");
  const [catPlatform, setCatPlatform] = useState<Platform>("instagram");
  const [catError, setCatError] = useState<string | null>(null);

  const categoryName = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (categoryName.get(s.category_id || "") || "").toLowerCase().includes(q),
    );
  }, [services, filter, categoryName]);

  function startNew() {
    setEditing("new");
    setForm({ ...BLANK });
    setError(null);
  }

  function startEdit(s: Service) {
    setEditing(s.id);
    setError(null);
    setForm({
      name: s.name,
      category_id: s.category_id,
      description: s.description ?? "",
      rate_per_1000: Number(s.rate_per_1000),
      min_quantity: s.min_quantity,
      max_quantity: s.max_quantity,
      speed: s.speed ?? "",
      active: s.active,
      provider_id: s.provider_id,
      provider_service_id: s.provider_service_id ?? "",
      provider_rate: s.provider_rate === null ? null : Number(s.provider_rate),
    });
  }

  function set<K extends keyof ServiceInput>(key: K, value: ServiceInput[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    start(async () => {
      const res = await saveService(form, editing === "new" ? undefined : editing!);
      if (!res.ok) { setError(res.error); return; }
      setEditing(null); setForm(null);
      router.refresh();
    });
  }

  function remove(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? If any order references it, deactivate it instead.`)) return;
    setError(null);
    start(async () => {
      const res = await deleteService(id);
      if (!res.ok) { setError(res.error); return; }
      router.refresh();
    });
  }

  function submitCategory(e: React.FormEvent) {
    e.preventDefault();
    setCatError(null);
    start(async () => {
      const res = await saveCategory(catName, catPlatform);
      if (!res.ok) { setCatError(res.error); return; }
      setCatName("");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="panel-input max-w-xs"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter services"
          aria-label="Filter services"
        />
        <button type="button" className="panel-btn panel-btn-primary" onClick={startNew}>
          Add service
        </button>
        <span className="text-sm text-[var(--text-muted)]">
          {visible.length} of {services.length}
        </span>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {form && (
        <form onSubmit={submit} noValidate className="panel-card grid gap-4 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
            {editing === "new" ? "New service" : "Edit service"}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="panel-label" htmlFor="svc-name">Name</label>
              <input id="svc-name" className="panel-input" value={form.name}
                     onChange={(e) => set("name", e.target.value)} placeholder="Instagram Followers — Real" />
            </div>

            <div>
              <label className="panel-label" htmlFor="svc-cat">Category</label>
              <select id="svc-cat" className="panel-input" value={form.category_id ?? ""}
                      onChange={(e) => set("category_id", e.target.value || null)}>
                <option value="">Uncategorised</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="panel-label" htmlFor="svc-rate">Rate per 1000 (what the customer pays)</label>
              <input id="svc-rate" className="panel-input" inputMode="decimal" value={String(form.rate_per_1000)}
                     onChange={(e) => set("rate_per_1000", Number(e.target.value))} />
            </div>

            <div>
              <label className="panel-label" htmlFor="svc-min">Minimum quantity</label>
              <input id="svc-min" className="panel-input" inputMode="numeric" value={String(form.min_quantity)}
                     onChange={(e) => set("min_quantity", Number(e.target.value))} />
            </div>

            <div>
              <label className="panel-label" htmlFor="svc-max">Maximum quantity</label>
              <input id="svc-max" className="panel-input" inputMode="numeric" value={String(form.max_quantity)}
                     onChange={(e) => set("max_quantity", Number(e.target.value))} />
            </div>

            <div>
              <label className="panel-label" htmlFor="svc-speed">Speed / delivery note</label>
              <input id="svc-speed" className="panel-input" value={form.speed ?? ""}
                     onChange={(e) => set("speed", e.target.value)} placeholder="0–6 hours" />
            </div>

            <div>
              <label className="panel-label" htmlFor="svc-active">Availability</label>
              <select id="svc-active" className="panel-input" value={form.active ? "yes" : "no"}
                      onChange={(e) => set("active", e.target.value === "yes")}>
                <option value="yes">Active — customers can order</option>
                <option value="no">Hidden</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="panel-label" htmlFor="svc-desc">Description</label>
              <textarea id="svc-desc" rows={2} className="panel-input" value={form.description ?? ""}
                        onChange={(e) => set("description", e.target.value)} />
            </div>
          </div>

          <fieldset className="grid gap-4 rounded-lg border border-[var(--border)] p-4 sm:grid-cols-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Provider mapping (optional)
            </legend>

            <div>
              <label className="panel-label" htmlFor="svc-provider">Provider</label>
              <select id="svc-provider" className="panel-input" value={form.provider_id ?? ""}
                      onChange={(e) => set("provider_id", e.target.value || null)}>
                <option value="">None — fulfil by hand</option>
                {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="panel-label" htmlFor="svc-psid">Provider service ID</label>
              <input id="svc-psid" className="panel-input" value={form.provider_service_id ?? ""}
                     onChange={(e) => set("provider_service_id", e.target.value)} placeholder="1234" />
            </div>

            <div>
              <label className="panel-label" htmlFor="svc-prate">Provider rate / 1000 (your cost)</label>
              <input id="svc-prate" className="panel-input" inputMode="decimal"
                     value={form.provider_rate === null ? "" : String(form.provider_rate)}
                     onChange={(e) => set("provider_rate", e.target.value === "" ? null : Number(e.target.value))} />
            </div>

            <p className="text-xs text-[var(--text-muted)] sm:col-span-3">
              Without a mapping, orders for this service stay in your queue to fulfil manually.
            </p>
          </fieldset>

          <div className="flex gap-2">
            <button type="submit" className="panel-btn panel-btn-primary" disabled={pending}>
              {pending ? "Saving…" : "Save service"}
            </button>
            <button type="button" className="panel-btn panel-btn-ghost"
                    onClick={() => { setEditing(null); setForm(null); }} disabled={pending}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {services.length === 0 ? (
        <EmptyState
          title="No services yet"
          body="Add your first service and it appears in the customer catalog straight away."
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Service</Th>
              <Th>Category</Th>
              <Th align="right">Rate / 1000</Th>
              <Th align="right">Min — Max</Th>
              <Th>Provider</Th>
              <Th>Status</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => {
              const margin =
                s.provider_rate !== null && Number(s.provider_rate) > 0
                  ? Math.round(((Number(s.rate_per_1000) - Number(s.provider_rate)) / Number(s.rate_per_1000)) * 100)
                  : null;
              return (
                <tr key={s.id}>
                  <Td>
                    <div className="font-medium text-[var(--text)]">{s.name}</div>
                    {s.speed && <div className="text-xs text-[var(--text-muted)]">{s.speed}</div>}
                  </Td>
                  <Td className="text-[var(--text-muted)]">{categoryName.get(s.category_id || "") || "—"}</Td>
                  <Td align="right" className="whitespace-nowrap font-semibold text-[var(--text)]">
                    {Number(s.rate_per_1000).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    {margin !== null && (
                      <div className="text-xs font-normal text-[var(--text-muted)]">{margin}% margin</div>
                    )}
                  </Td>
                  <Td align="right" className="whitespace-nowrap text-[var(--text-muted)]">
                    {s.min_quantity.toLocaleString()} — {s.max_quantity.toLocaleString()}
                  </Td>
                  <Td className="text-[var(--text-muted)]">
                    {s.provider_id
                      ? (providers.find((p) => p.id === s.provider_id)?.name ?? "unknown")
                      : "Manual"}
                  </Td>
                  <Td><Badge tone={s.active ? "ok" : "neutral"}>{s.active ? "active" : "hidden"}</Badge></Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1.5">
                      <button type="button" className="panel-btn panel-btn-ghost !px-2.5 !py-1 text-xs"
                              onClick={() => startEdit(s)} disabled={pending}>
                        Edit
                      </button>
                      <button type="button" className="panel-btn panel-btn-ghost !px-2.5 !py-1 text-xs"
                              onClick={() => remove(s.id, s.name)} disabled={pending}>
                        Delete
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}

      <div className="panel-card grid gap-3 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">Categories</h2>
        <div className="flex flex-wrap gap-1.5">
          {categories.length === 0
            ? <span className="text-sm text-[var(--text-muted)]">None yet.</span>
            : categories.map((c) => (
                <Badge key={c.id}>{c.name} · {PLATFORM_LABELS[c.platform] ?? c.platform}</Badge>
              ))}
        </div>

        <form onSubmit={submitCategory} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="panel-label" htmlFor="cat-name">New category</label>
            <input id="cat-name" className="panel-input !py-1.5 text-sm" value={catName}
                   onChange={(e) => setCatName(e.target.value)} placeholder="Instagram Likes" />
          </div>
          <div>
            <label className="panel-label" htmlFor="cat-platform">Platform</label>
            <select id="cat-platform" className="panel-input !py-1.5 text-sm" value={catPlatform}
                    onChange={(e) => setCatPlatform(e.target.value as Platform)}>
              {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="panel-btn panel-btn-ghost !py-1.5 text-sm" disabled={pending || !catName.trim()}>
            Add category
          </button>
        </form>

        {catError && (
          <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">{catError}</p>
        )}
      </div>
    </div>
  );
}
