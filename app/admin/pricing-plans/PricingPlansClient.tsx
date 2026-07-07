"use client";

import { useState, useTransition } from "react";
import type { PricingPlanRow } from "@/lib/supabase/types";
import { updatePricingPlan } from "./actions";

export default function PricingPlansClient({ plans, canWrite }: { plans: PricingPlanRow[]; canWrite: boolean }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setMessage("");
    setError("");
    startTransition(async () => {
      const result = await updatePricingPlan(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Pricing plan saved.");
    });
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {message && (
        <div className="admin-card" style={{ background: "rgba(34,197,94,0.10)", borderColor: "rgba(34,197,94,0.30)", color: "#86efac" }}>
          {message}
        </div>
      )}
      {error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5" }}>
          {error}
        </div>
      )}

      {plans.map((plan) => (
        <form key={plan.id} action={onSubmit} className="admin-card admin-form">
          <input type="hidden" name="id" value={plan.id} />
          <header className="admin-section-head">
            <h3>{plan.name}</h3>
            <p>Changes here update the public pricing page and future checkout amounts.</p>
          </header>

          <div className="admin-row cols-3">
            <Field label="Plan name" name="name" defaultValue={plan.name} disabled={!canWrite} required />
            <Field label="Slug" name="slug" defaultValue={plan.slug} disabled={!canWrite} required />
            <label>
              <span className="admin-label">Plan type</span>
              <select className="admin-select" name="price_type" defaultValue={plan.price_type} disabled={!canWrite}>
                <option value="fixed">Fixed checkout price</option>
                <option value="custom">Custom / contact sales</option>
              </select>
            </label>
          </div>

          <label>
            <span className="admin-label">Description</span>
            <input className="admin-input" name="description" defaultValue={plan.description} disabled={!canWrite} />
          </label>

          <div className="admin-row cols-3">
            <Field label="Monthly price" name="monthly_price" type="number" min={0} step="1" defaultValue={String(plan.monthly_price)} disabled={!canWrite} />
            <Field label="Yearly price" name="yearly_price" type="number" min={0} step="1" defaultValue={String(plan.yearly_price)} disabled={!canWrite} />
            <Field label="Currency" name="currency" defaultValue={plan.currency} disabled={!canWrite} required />
          </div>

          <label>
            <span className="admin-label">Features list</span>
            <textarea className="admin-textarea" name="features" rows={5} defaultValue={(plan.features || []).join("\n")} disabled={!canWrite} />
            <p className="admin-help">One feature per line.</p>
          </label>

          <div className="admin-row cols-3">
            <Field label="Badge text" name="badge_text" defaultValue={plan.badge_text || ""} disabled={!canWrite} />
            <Field label="Button text" name="button_text" defaultValue={plan.button_text || ""} disabled={!canWrite} />
            <Field label="Sort order" name="sort_order" type="number" step="1" defaultValue={String(plan.sort_order)} disabled={!canWrite} />
          </div>

          <div className="admin-row cols-3">
            <div style={{ display: "grid", alignContent: "center", gap: 8 }}>
              <label className="admin-checkbox-row">
                <input type="checkbox" name="is_popular" defaultChecked={plan.is_popular} disabled={!canWrite} />
                Is popular
              </label>
              <label className="admin-checkbox-row">
                <input type="checkbox" name="is_active" defaultChecked={plan.is_active} disabled={!canWrite} />
                Is active
              </label>
            </div>
          </div>

          {canWrite && (
            <div className="admin-form-actions">
              <button type="submit" className="admin-btn admin-btn-primary" disabled={pending}>
                {pending ? "Saving..." : "Save changes"}
              </button>
            </div>
          )}
        </form>
      ))}
    </div>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, ...inputProps } = props;
  return (
    <label>
      <span className="admin-label">{label}</span>
      <input className="admin-input" {...inputProps} />
    </label>
  );
}
