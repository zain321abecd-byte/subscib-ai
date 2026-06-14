import type { StockStatus } from "@/lib/supabase/types";
import { STOCK_STATUS_LABELS } from "@/lib/stock";

export default function StockStatusPill({ status }: { status: StockStatus }) {
  return <span className={`admin-pill admin-pill-stock-${status}`}>{STOCK_STATUS_LABELS[status]}</span>;
}
