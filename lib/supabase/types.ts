// Hand-written DB row types. Keep in sync with supabase/schema.sql.
// (We can swap to `supabase gen types` later if/when needed.)

export type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  brand: string | null;
  tag: string | null;
  icon_class: string | null;
  media_class: string | null;
  image_url: string | null;
  /** Hex color shown behind the brand icon (e.g. "#10A37F"). null → use card surface. */
  icon_bg_color: string | null;
  /** Which visual to render as the main media: "image" or "brand".
   *  null → auto: image wins if set, otherwise brand. */
  display_source: string | null;
  /** Additional gallery images (URLs). Cover stays in image_url. */
  gallery: string[] | null;
  in_stock: boolean;
  featured: boolean;
  /** Whether this product appears in "You may also like" on other product pages. */
  show_in_related: boolean;
  /** Admin-curated list of product IDs to feature in this product's "You may also like". */
  related_product_ids: string[] | null;
  /** Optional second-tier "Private" package. Null/0 → only shared tier shows. */
  private_price: number | null;
  private_description: string | null;
  shared_label: string | null;
  private_label: string | null;
  /** Custom bullet lines shown under the price. Empty → fallback defaults. */
  features: string[] | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type BlogPostRow = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  date: string; // ISO date
  read_mins: number;
  tag: string;
  author: string;
  author_initials: string;
  author_color: string;
  cover_url: string | null;
  featured: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
};

export type OrderRow = {
  id: string;
  order_number: string;
  customer_email: string;
  customer_phone: string | null;
  customer_name: string | null;
  items: OrderItem[];
  subtotal_usd: number;
  subtotal_pkr: number | null;
  status: "pending" | "paid" | "delivered" | "failed" | "refunded" | "cancelled";
  payment_method: string | null;
  transaction_id: string | null;
  notes: string | null;
  delivered_at: string | null;
  /** Traffic attribution captured at first landing. */
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  landing_page: string | null;
  /** Which package tier the customer purchased — "shared" | "private". */
  package_tier: string | null;
  /** Supabase Auth user_id of the customer who placed the order (null for guests). */
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ReviewRow = {
  id: string;
  name: string;
  initials: string;
  color: string | null;
  photo_url: string | null;
  rating: number;
  text: string;
  product_id: string | null;
  product_name: string | null;
  approved: boolean;
  sort_order: number;
  created_at: string;
};

export type FreebieRow = {
  id: string;
  title: string;
  description: string;
  icon_class: string | null;
  file_url: string | null;
  whatsapp_msg: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
};

export type SiteSettingRow = {
  key: string;
  value: unknown;
  updated_at: string;
};

export type AdminRow = {
  user_id: string;
  email: string;
  role: "admin" | "superadmin";
  created_at: string;
};
