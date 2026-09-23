import Link from "next/link";
import type { OrderStatus, PaymentStatus, TicketStatus } from "@/lib/panel/types";

/**
 * Shared presentation pieces. Server-safe (no hooks), so pages can render them
 * directly and only reach for a client component where there's real
 * interaction.
 */

export function PageHeader({
  title, subtitle, action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`panel-card p-5 ${className}`}>{children}</div>;
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="panel-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-[var(--text)]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  title, body, action,
}: {
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-card px-6 py-12 text-center">
      <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
      {body && <p className="mx-auto mt-1.5 max-w-md text-sm text-[var(--text-muted)]">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

const TONES = {
  neutral: "bg-[var(--surface-3)] text-[var(--text-muted)]",
  info: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
  ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  warn: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
} as const;

export function Badge({
  children, tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
}) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}

const ORDER_TONES: Record<OrderStatus, keyof typeof TONES> = {
  pending: "warn",
  processing: "info",
  in_progress: "info",
  completed: "ok",
  partial: "warn",
  cancelled: "neutral",
  failed: "danger",
};

export function OrderBadge({ status }: { status: OrderStatus }) {
  const label = status.replace(/_/g, " ");
  return <Badge tone={ORDER_TONES[status] ?? "neutral"}>{label}</Badge>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const tone = status === "approved" ? "ok" : status === "rejected" ? "danger" : "warn";
  return <Badge tone={tone}>{status}</Badge>;
}

export function TicketBadge({ status }: { status: TicketStatus }) {
  const tone = status === "closed" ? "neutral" : status === "answered" ? "ok" : "warn";
  return <Badge tone={tone}>{status}</Badge>;
}

/** Horizontal scroll lives on the wrapper so a wide table never widens the page. */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({ children, align = "left" }: { children?: React.ReactNode; align?: "left" | "right" | "center" }) {
  return (
    <th
      style={{ textAlign: align }}
      className="border-b border-[var(--border)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
    >
      {children}
    </th>
  );
}

export function Td({
  children, align = "left", className = "",
}: {
  children?: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <td style={{ textAlign: align }} className={`border-b border-[var(--border)] px-4 py-3 ${className}`}>
      {children}
    </td>
  );
}

export function Money({ value, currency = "PKR" }: { value: number | null | undefined; currency?: string }) {
  return (
    <>
      {Number(value ?? 0).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
    </>
  );
}

export function DateText({ value }: { value: string | null | undefined }) {
  if (!value) return <>—</>;
  return (
    <>
      {new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
    </>
  );
}

export function LinkButton({
  href, children, variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
}) {
  return (
    <Link href={href} className={`panel-btn ${variant === "primary" ? "panel-btn-primary" : "panel-btn-ghost"}`}>
      {children}
    </Link>
  );
}
