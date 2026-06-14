"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { StockItemRow } from "@/lib/supabase/types";
import { createStockItem, updateStockItem } from "./actions";

export default function StockForm({ item }: { item?: StockItemRow }) {
  const isEdit = !!item;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const action = isEdit ? updateStockItem : createStockItem;
      const result = await action(formData);
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <form action={submit} className="admin-form admin-form-narrow">
      {isEdit && <input type="hidden" name="__id" value={item.id} />}
      {error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5" }}>
          {error}
        </div>
      )}

      <section className="admin-card">
        <header className="admin-section-head">
          <h3>{isEdit ? "Edit stock item" : "Add stock item"}</h3>
          <p>Track expiry timing and who should receive renewal reminders.</p>
        </header>

        <div className="admin-row cols-2">
          <label>
            <span className="admin-label">Item name</span>
            <input className="admin-input" name="item_name" required defaultValue={item?.item_name ?? ""} />
          </label>
          <label>
            <span className="admin-label">Category</span>
            <input className="admin-input" name="category" defaultValue={item?.category ?? ""} />
          </label>
        </div>

        <div className="admin-row cols-3">
          <label>
            <span className="admin-label">Quantity</span>
            <input className="admin-input" type="number" min="0.01" step="0.01" name="quantity" required defaultValue={item?.quantity ?? ""} />
          </label>
          <label>
            <span className="admin-label">Unit</span>
            <input className="admin-input" name="unit" placeholder="packs, boxes, units..." defaultValue={item?.unit ?? ""} />
          </label>
          <label>
            <span className="admin-label">Expiry date</span>
            <input className="admin-input" type="date" name="expiry_date" required defaultValue={item?.expiry_date ?? ""} />
          </label>
        </div>

        <div className="admin-row cols-2">
          <label>
            <span className="admin-label">Reminder days before expiry</span>
            <input
              className="admin-input"
              type="number"
              min="0"
              step="1"
              name="reminder_days_before_expiry"
              defaultValue={item?.reminder_days_before_expiry ?? 7}
            />
          </label>
          <label>
            <span className="admin-label">Contact email</span>
            <input className="admin-input" type="email" name="contact_email" required defaultValue={item?.contact_email ?? ""} />
          </label>
        </div>

        <div className="admin-row cols-2">
          <label>
            <span className="admin-label">Supplier name</span>
            <input className="admin-input" name="supplier_name" defaultValue={item?.supplier_name ?? ""} />
          </label>
          <label>
            <span className="admin-label">Notes</span>
            <textarea className="admin-textarea" name="notes" defaultValue={item?.notes ?? ""} />
          </label>
        </div>
      </section>

      <div className="admin-form-actions">
        <Link href="/admin/stock" className="admin-btn admin-btn-ghost">Cancel</Link>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={isPending}>
          {isPending ? <span className="admin-spinner" /> : <i className="fa-solid fa-check"></i>}
          {isEdit ? "Save changes" : "Create stock item"}
        </button>
      </div>
    </form>
  );
}
