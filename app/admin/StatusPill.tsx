import type { OrderRow } from "@/lib/supabase/types";

const LABELS: Record<OrderRow["status"], string> = {
  pending: "Pending",
  paid: "Paid",
  delivered: "Delivered",
  failed: "Failed",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

export default function StatusPill({ status }: { status: OrderRow["status"] }) {
  return <span className={`admin-pill admin-pill-${status}`}>{LABELS[status]}</span>;
}
