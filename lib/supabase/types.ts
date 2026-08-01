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
  /** Whether this product appears in the secondary homepage tools section. */
  show_on_homepage: boolean;
  /** Whether this product appears in "You may also like" on other product pages. */
  show_in_related: boolean;
  /** Admin-curated list of product IDs to feature in this product's "You may also like". */
  related_product_ids: string[] | null;
  /** Optional second-tier "Private" package. Null/0 → only shared tier shows. */
  private_price: number | null;
  private_description: string | null;
  shared_label: string | null;
  private_label: string | null;
  /** Hide the "Shared" account type on this product's buy box (private only). */
  hide_shared_plan: boolean;
  /** How the product image sits in its container: cover (fill) or contain (fit). */
  image_fit: string | null;
  /** Crop ratio applied to the product image everywhere it appears:
   *  "original" | "1:1" | "4:3" | "16:9" | "3:4". */
  image_ratio: string | null;
  /** Plans, durations, and Plan + Account Type + Duration price matrix. */
  variation_config: unknown | null;
  /** Custom bullet lines shown under the price. Empty → fallback defaults. */
  features: string[] | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type BlogPostRow = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  date: string; // ISO date
  read_mins: number;
  tag: string;
  tags?: string[] | null;
  author: string;
  author_initials: string;
  author_color: string;
  author_id?: string | null;
  author_bio?: string | null;
  author_image?: string | null;
  author_social_links?: Record<string, string> | null;
  category_id?: string | null;
  category_name?: string | null;
  cover_url: string | null;
  featured_image_alt?: string | null;
  featured: boolean;
  published: boolean;
  status?: "Draft" | "Published" | "Scheduled" | string | null;
  scheduled_at?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  focus_keyword?: string | null;
  secondary_keywords?: string[] | null;
  canonical_url?: string | null;
  robots_index?: boolean | null;
  robots_follow?: boolean | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  twitter_image?: string | null;
  schema_type?: "BlogPosting" | "Article" | string | null;
  faq_items?: Array<{ question: string; answer: string }> | null;
  related_post_ids?: string[] | null;
  redirect_from?: string[] | null;
  created_at: string;
  updated_at: string;
};

export type BlogCategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogTagRow = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type BlogAuthorRow = {
  id: string;
  name: string;
  bio: string | null;
  image: string | null;
  social_links: Record<string, string> | null;
  created_at: string;
  updated_at: string;
};

export type RedirectRow = {
  id: string;
  old_slug: string;
  new_slug: string;
  status_code: number;
  created_at: string;
};

export type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  variation?: {
    plan?: string;
    accountType?: string;
    accountLabel?: string;
    duration?: string;
    summary?: string;
    pricingPlan?: {
      planId: string;
      slug: string;
      name: string;
      billingCycle: "monthly" | "yearly";
      currency: string;
    };
    bundle?: {
      key: string;
      name: string;
      billingCycle: "monthly" | "yearly";
      selectedTools: string[];
      toolLimit: number;
    };
  };
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
  fulfillment_status: "pending" | "in_progress" | "activated" | "rejected" | "expired" | null;
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

export type StockStatus = "active" | "expiringSoon" | "expired" | "renewed";

export type StockItemRow = {
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
  last_reminder_sent_at: string | null;
  last_expired_reminder_sent_at: string | null;
  renewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PricingPlanRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  currency: string;
  features: string[];
  badge_text: string | null;
  button_text: string | null;
  is_popular: boolean;
  is_active: boolean;
  price_type: "fixed" | "custom";
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SiteSettingRow = {
  key: string;
  value: unknown;
  updated_at: string;
};

export type TrafficSessionRow = {
  session_id: string;
  first_seen: string;
  last_seen: string;
  pageviews: number;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  landing_page: string | null;
  last_page: string | null;
  user_id: string | null;
  user_email: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  platform: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
};

export type ContactMessageStatus = "unread" | "read" | "resolved";

export type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: ContactMessageStatus;
  created_at: string;
  updated_at: string;
};

export type BusinessBundleInquiryStatus = "new" | "contacted" | "resolved" | "rejected";

export type BusinessBundleInquiryRow = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  company_name: string;
  team_size: string;
  required_tools: string;
  message: string;
  status: BusinessBundleInquiryStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomPricingRequestStatus = "new" | "contacted" | "in_progress" | "converted" | "rejected";

export type CustomPricingRequestRow = {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string;
  company_name: string | null;
  team_size: string | null;
  required_tools: string;
  billing_cycle: "monthly" | "yearly";
  budget: string | null;
  message: string;
  status: CustomPricingRequestStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminRow = {
  user_id: string;
  email: string;
  role: "admin" | "superadmin";
  created_at: string;
};
