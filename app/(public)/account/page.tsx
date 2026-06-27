"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import SignOutButton from "./SignOutButton";

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Pending",   cls: "is-pending" },
  paid:      { label: "Paid",      cls: "is-paid" },
  delivered: { label: "Delivered", cls: "is-delivered" },
  failed:    { label: "Failed",    cls: "is-failed" },
  refunded:  { label: "Refunded",  cls: "is-refunded" },
  cancelled: { label: "Cancelled", cls: "is-cancelled" },
};

function fmtDate(ms: number) {
  return new Date(ms).toLocaleString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtPKR(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(Number(n));
}

export default function AccountPage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const cart = useCart();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login?next=/account");
      return;
    }
    setAuthChecked(true);
  }, [ready, user, router]);

  if (!ready || !authChecked || !user) {
    return (
      <section className="v2-section">
        <div className="v2-container">
          <div className="surface-card">
            <div className="empty-state">
              <div className="empty-state-icon"><i className="fa-solid fa-lock"></i></div>
              <h3>Sign in required</h3>
              <p>Sign in to see your orders and manage your account.</p>
              <Link
                href="/login?next=/account"
                className="btn btn-primary"
                style={{ marginTop: "var(--space-3)" }}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const displayName = user.name?.trim() || user.email;
  const orders = cart.orders.slice().sort((a, b) => b.placedAt - a.placedAt);

  return (
    <section className="v2-section">
      <div className="v2-container">
        <header
          className="v2-section-head"
          style={{
            textAlign: "left",
            maxWidth: "none",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <p className="v2-eyebrow">Account</p>
            <h2>Hi {displayName}</h2>
            <p style={{ color: "var(--text-muted)", marginTop: 6 }}>{user.email}</p>
          </div>
          <SignOutButton />
        </header>

        {orders.length === 0 ? (
          <div className="surface-card">
            <div className="empty-state">
              <div className="empty-state-icon"><i className="fa-solid fa-bag-shopping"></i></div>
              <h3>No orders yet</h3>
              <p>When you place your first order, it&rsquo;ll show up here.</p>
              <Link href="/shop" className="btn btn-primary" style={{ marginTop: "var(--space-3)" }}>
                Browse the shop
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "var(--space-4)" }}>
            <h3 style={{ fontFamily: "var(--font-heading)", color: "var(--text)", margin: 0 }}>
              Your orders ({orders.length})
            </h3>
            {orders.map((o) => {
              const pill = STATUS_PILL[o.status] || { label: o.status, cls: "" };
              return (
                <article key={o.orderId} className="account-order">
                  <header className="account-order-head">
                    <div>
                      <code className="account-order-number">{o.orderId}</code>
                      <span className={`account-order-pill ${pill.cls}`}>{pill.label}</span>
                    </div>
                    <span className="account-order-date">{fmtDate(o.placedAt)}</span>
                  </header>

                  <ul className="account-order-items">
                    {o.items.map((it, i) => (
                      <li key={`${it.id}-${i}`}>
                        <span>{it.name}</span>
                        <small>× {it.qty} · {fmtPKR(it.price)}</small>
                      </li>
                    ))}
                  </ul>

                  <footer className="account-order-foot">
                    <div>
                      <strong>{fmtPKR(o.pkrTotal)}</strong>
                    </div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "capitalize" }}>
                      {o.paymentProvider}
                    </span>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
