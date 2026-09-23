"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { placeOrder } from "@/lib/panel/actions/orders";
import { calculateCharge, type Service, type ServiceCategory } from "@/lib/panel/types";

export default function NewOrderForm({
  services,
  categories,
  balance,
  currency,
  initialServiceId,
}: {
  services: Service[];
  categories: ServiceCategory[];
  balance: number;
  currency: string;
  initialServiceId?: string;
}) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(initialServiceId || services[0]?.id || "");
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ charge: number } | null>(null);

  const service = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);
  const qty = Number(quantity);
  const validQty = Number.isFinite(qty) && qty > 0;

  // Priced from the same formula the server uses, so the number on screen is
  // the number that gets charged.
  const charge = service && validQty ? calculateCharge(service.rate_per_1000, qty) : 0;
  const affordable = charge <= balance;

  const quantityProblem =
    service && validQty && qty < service.min_quantity
      ? `Minimum for this service is ${service.min_quantity.toLocaleString()}.`
      : service && validQty && qty > service.max_quantity
        ? `Maximum for this service is ${service.max_quantity.toLocaleString()}.`
        : null;

  const canSubmit = Boolean(service) && validQty && !quantityProblem && affordable && link.trim().length > 0 && !busy;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await placeOrder({ serviceId, link, quantity: qty });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setDone({ charge: res.data!.charge });
    setLink("");
    setQuantity("");
    router.refresh();
  }

  if (services.length === 0) {
    return (
      <div className="panel-card p-6 text-center">
        <p className="text-sm font-semibold text-[var(--text)]">No services to order yet</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          An administrator needs to add services to the catalog first.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_320px]">
      <form onSubmit={onSubmit} noValidate className="panel-card grid gap-4 p-5">
        {done && (
          <div role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            Order placed — {done.charge.toLocaleString("en-PK", { minimumFractionDigits: 2 })} {currency} taken from
            your balance. Track it under <a href="/panel/orders" className="font-semibold underline">My orders</a>.
          </div>
        )}

        <div>
          <label className="panel-label" htmlFor="service">Service</label>
          <select
            id="service"
            className="panel-input"
            value={serviceId}
            onChange={(e) => { setServiceId(e.target.value); setDone(null); }}
          >
            {categories.map((c) => {
              const items = services.filter((s) => s.category_id === c.id);
              if (items.length === 0) return null;
              return (
                <optgroup key={c.id} label={c.name}>
                  {items.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {Number(s.rate_per_1000).toLocaleString("en-PK")} {currency}/1k
                    </option>
                  ))}
                </optgroup>
              );
            })}
            {services.filter((s) => !categories.some((c) => c.id === s.category_id)).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {Number(s.rate_per_1000).toLocaleString("en-PK")} {currency}/1k
              </option>
            ))}
          </select>
          {service?.description && (
            <p className="mt-1.5 text-xs text-[var(--text-muted)]">{service.description}</p>
          )}
        </div>

        <div>
          <label className="panel-label" htmlFor="link">Link</label>
          <input
            id="link"
            className="panel-input"
            value={link}
            onChange={(e) => { setLink(e.target.value); setDone(null); }}
            placeholder="https://instagram.com/yourprofile"
            inputMode="url"
          />
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            The exact post or profile URL. Wrong links can&apos;t be recovered once the provider starts.
          </p>
        </div>

        <div>
          <label className="panel-label" htmlFor="quantity">Quantity</label>
          <input
            id="quantity"
            className="panel-input"
            value={quantity}
            onChange={(e) => { setQuantity(e.target.value); setDone(null); }}
            inputMode="numeric"
            placeholder={service ? String(service.min_quantity) : "1000"}
            aria-describedby="quantity-hint"
          />
          <p id="quantity-hint" className="mt-1.5 text-xs text-[var(--text-muted)]">
            {service
              ? `Between ${service.min_quantity.toLocaleString()} and ${service.max_quantity.toLocaleString()}.`
              : "Pick a service first."}
          </p>
          {quantityProblem && <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{quantityProblem}</p>}
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <button type="submit" className="panel-btn panel-btn-primary" disabled={!canSubmit}>
          {busy ? "Placing order…" : "Place order"}
        </button>

        {!affordable && charge > 0 && (
          <p className="text-center text-xs text-[var(--text-muted)]">
            You need {(charge - balance).toLocaleString("en-PK", { minimumFractionDigits: 2 })} {currency} more —{" "}
            <a href="/panel/wallet" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">add funds</a>.
          </p>
        )}
      </form>

      <aside className="panel-card h-fit p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">Summary</h2>
        <dl className="mt-3 grid gap-2.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--text-muted)]">Rate / 1000</dt>
            <dd className="font-medium text-[var(--text)]">
              {service ? `${Number(service.rate_per_1000).toLocaleString("en-PK", { minimumFractionDigits: 2 })} ${currency}` : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--text-muted)]">Quantity</dt>
            <dd className="font-medium text-[var(--text)]">{validQty ? qty.toLocaleString() : "—"}</dd>
          </div>
          <div className="mt-1 flex justify-between gap-3 border-t border-[var(--border)] pt-3">
            <dt className="font-semibold text-[var(--text)]">Charge</dt>
            <dd className="text-lg font-bold text-[var(--text)]">
              {charge.toLocaleString("en-PK", { minimumFractionDigits: 2 })} {currency}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--text-muted)]">Balance after</dt>
            <dd className={`font-medium ${affordable ? "text-[var(--text)]" : "text-red-600 dark:text-red-400"}`}>
              {(balance - charge).toLocaleString("en-PK", { minimumFractionDigits: 2 })} {currency}
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
