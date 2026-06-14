"use client";

import { useState, useTransition } from "react";
import { renewStockItem } from "./actions";

export default function RenewStockForm({
  id,
  quantity,
  reminderDaysBeforeExpiry,
}: {
  id: string;
  quantity: number;
  reminderDaysBeforeExpiry: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await renewStockItem(formData);
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <details className="stock-renew">
      <summary className="admin-btn admin-btn-ghost" style={{ padding: "6px 12px" }}>
        Renew
      </summary>
      <form action={submit} className="stock-renew-form">
        <input type="hidden" name="id" value={id} />
        <label>
          <span>New expiry date</span>
          <input className="admin-input" type="date" name="expiry_date" required />
        </label>
        <label>
          <span>Quantity</span>
          <input className="admin-input" type="number" min="0.01" step="0.01" name="quantity" defaultValue={quantity} />
        </label>
        <input type="hidden" name="reminder_days_before_expiry" value={reminderDaysBeforeExpiry} />
        {error && <div className="stock-inline-error">{error}</div>}
        <button type="submit" className="admin-btn admin-btn-primary" disabled={isPending}>
          {isPending ? <span className="admin-spinner" /> : <i className="fa-solid fa-check"></i>}
          Save renewal
        </button>
      </form>
    </details>
  );
}
