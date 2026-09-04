import { getSupabaseServer } from "@/lib/supabase/server";
import { createCoupon, deleteCoupon, toggleCoupon } from "./actions";

export const metadata = { title: "Promo codes" };

export const dynamic = "force-dynamic";

type CouponRow = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  value: number;
  active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
  note: string | null;
  created_at: string;
};

export default async function CouponsAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });
  const coupons = (data ?? []) as CouponRow[];

  const fmtDiscount = (c: CouponRow) =>
    c.discount_type === "percent" ? `${c.value}% off` : `Rs ${Number(c.value).toLocaleString("en-PK")} off`;

  return (
    <>
      <header className="admin-page-head">
        <div>
          <h1>Promo codes</h1>
          <p>Coupons shoppers can apply on product pages and at checkout. Percent codes discount the cart subtotal; fixed codes take a PKR amount off.</p>
        </div>
      </header>

      {(params.created || params.updated || params.deleted) && (
        <div className="admin-card" style={{ background: "rgba(34,197,94,0.10)", borderColor: "rgba(34,197,94,0.30)", color: "#86efac", marginBottom: 14 }}>
          {params.created && "Promo code created."}
          {params.updated && "Promo code updated."}
          {params.deleted && "Promo code deleted."}
        </div>
      )}

      {(params.error || error) && (
        <div className="admin-card" style={{ background: "rgba(245,72,72,0.10)", borderColor: "rgba(245,72,72,0.30)", color: "#fca5a5", marginBottom: 14 }}>
          {params.error || error?.message}
          {error?.message?.includes("coupons") && (
            <> — run <code>supabase/15-coupons.sql</code> in the Supabase SQL editor to create the table.</>
          )}
        </div>
      )}

      {/* Create */}
      <form action={createCoupon} className="admin-card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: "var(--text)", margin: "0 0 12px" }}>Add promo code</h3>
        <div className="admin-row cols-3">
          <label className="admin-field">
            <span>Code</span>
            <input name="code" placeholder="WELCOME10" required style={{ textTransform: "uppercase" }} />
          </label>
          <label className="admin-field">
            <span>Type</span>
            <select name="discount_type" defaultValue="percent">
              <option value="percent">Percent off (%)</option>
              <option value="fixed">Fixed amount off (PKR)</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Value</span>
            <input name="value" type="number" min="1" step="0.01" placeholder="10" required />
          </label>
        </div>
        <div className="admin-row cols-3">
          <label className="admin-field">
            <span>Expires (optional)</span>
            <input name="expires_at" type="datetime-local" />
          </label>
          <label className="admin-field">
            <span>Max uses (optional)</span>
            <input name="max_uses" type="number" min="1" step="1" placeholder="Unlimited" />
          </label>
          <label className="admin-field">
            <span>Note (admin only)</span>
            <input name="note" placeholder="e.g. Eid campaign" />
          </label>
        </div>
        <label className="admin-checkbox-row" style={{ marginTop: 8 }}>
          <input type="checkbox" name="active" defaultChecked /> <span>Active</span>
        </label>
        <div style={{ marginTop: 12 }}>
          <button type="submit" className="admin-btn admin-btn-primary">Create promo code</button>
        </div>
      </form>

      {/* List */}
      <div className="admin-card">
        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: "var(--text)", margin: "0 0 12px" }}>
          All promo codes {coupons.length > 0 && <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>({coupons.length})</span>}
        </h3>
        {coupons.length === 0 ? (
          <p style={{ color: "var(--text-muted)", margin: 0 }}>No promo codes yet. Create your first one above.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                  <th style={{ padding: "8px 10px" }}>Code</th>
                  <th style={{ padding: "8px 10px" }}>Discount</th>
                  <th style={{ padding: "8px 10px" }}>Status</th>
                  <th style={{ padding: "8px 10px" }}>Uses</th>
                  <th style={{ padding: "8px 10px" }}>Expires</th>
                  <th style={{ padding: "8px 10px" }}>Note</th>
                  <th style={{ padding: "8px 10px" }}></th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const expired = c.expires_at ? new Date(c.expires_at).getTime() < Date.now() : false;
                  const exhausted = c.max_uses != null && c.used_count >= c.max_uses;
                  return (
                    <tr key={c.id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <td style={{ padding: "10px", fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "#fff" }}>{c.code}</td>
                      <td style={{ padding: "10px", color: "var(--text-soft)" }}>{fmtDiscount(c)}</td>
                      <td style={{ padding: "10px" }}>
                        {!c.active ? (
                          <span style={{ color: "var(--text-muted)" }}>Inactive</span>
                        ) : expired ? (
                          <span style={{ color: "#fca5a5" }}>Expired</span>
                        ) : exhausted ? (
                          <span style={{ color: "#fca5a5" }}>Fully used</span>
                        ) : (
                          <span style={{ color: "var(--success-500)" }}>Active</span>
                        )}
                      </td>
                      <td style={{ padding: "10px", color: "var(--text-soft)" }}>
                        {c.used_count}{c.max_uses != null ? ` / ${c.max_uses}` : ""}
                      </td>
                      <td style={{ padding: "10px", color: "var(--text-soft)" }}>
                        {c.expires_at ? new Date(c.expires_at).toLocaleString() : "Never"}
                      </td>
                      <td style={{ padding: "10px", color: "var(--text-muted)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.note || "—"}
                      </td>
                      <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                        <form action={toggleCoupon} style={{ display: "inline-block", marginRight: 8 }}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="next_active" value={c.active ? "0" : "1"} />
                          <button type="submit" className="admin-btn admin-btn-ghost">
                            {c.active ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                        <form action={deleteCoupon} style={{ display: "inline-block" }}>
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit" className="admin-btn admin-btn-danger">Delete</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
