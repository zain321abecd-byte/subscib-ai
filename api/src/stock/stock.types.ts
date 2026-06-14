export type StockStatus = "active" | "expiringSoon" | "expired" | "renewed";

export interface StockItemRow {
  id: string;
  item_name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  expiry_date: string;
  reminder_days_before_expiry: number;
  contact_email: string;
  supplier_name: string | null;
  status: StockStatus;
  notes: string | null;
  renewed_at: string | null;
  last_reminder_sent_at: string | null;
  last_expired_reminder_sent_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export type StockItemWithComputed = StockItemRow & {
  days_left: number;
  computed_status: StockStatus;
};

export type StockFormInput = {
  item_name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  expiry_date: string;
  reminder_days_before_expiry: number;
  contact_email: string;
  supplier_name: string | null;
  status: StockStatus;
  notes: string | null;
};
