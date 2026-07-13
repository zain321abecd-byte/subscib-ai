import { BadRequestException, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseService } from "../supabase/supabase.service";
import { ensureUniqueSlug, slugify } from "../common/slug";

type ProductInput = {
  name: string;
  description: string;
  price: number;
  category: string;
  brand: string | null;
  tag: string | null;
  icon_class: string | null;
  media_class: string;
  image_url: string | null;
  icon_bg_color: string | null;
  display_source: string | null;
  gallery: string[];
  related_product_ids: string[];
  features: string[];
  private_price: number | null;
  private_description: string | null;
  shared_label: string | null;
  private_label: string | null;
  variation_config: unknown | null;
  in_stock: boolean;
  featured: boolean;
  show_on_homepage: boolean;
  show_in_related: boolean;
  sort_order: number;
};

type ReviewInput = {
  id?: string;
  name: string;
  initials: string;
  color: string;
  rating: number;
  text: string;
  approved: boolean;
};

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((u): u is string => typeof u === "string" && u.length > 0) : [];
}

function normalize(raw: any): ProductInput {
  const str = (v: unknown) => (v == null ? "" : String(v).trim());
  const hex = str(raw.icon_bg_color);
  const display = str(raw.display_source);
  const privatePriceNum = Number(raw.private_price);

  return {
    name: str(raw.name),
    description: str(raw.description),
    price: Number(raw.price),
    category: str(raw.category),
    brand: str(raw.brand) || null,
    tag: str(raw.tag) || null,
    icon_class: str(raw.icon_class) || null,
    media_class: str(raw.media_class) || "media-blue",
    image_url: str(raw.image_url) || null,
    icon_bg_color: /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex) ? hex.toUpperCase() : null,
    display_source: display === "image" || display === "brand" ? display : null,
    gallery: strArray(raw.gallery),
    related_product_ids: strArray(raw.related_product_ids),
    features: strArray(raw.features).filter((s) => s.trim().length > 0),
    private_price: raw.private_price === "" || raw.private_price == null || !Number.isFinite(privatePriceNum) || privatePriceNum <= 0 ? null : privatePriceNum,
    private_description: str(raw.private_description) || null,
    shared_label: str(raw.shared_label) || null,
    private_label: str(raw.private_label) || null,
    variation_config: raw.variation_config && typeof raw.variation_config === "object" ? raw.variation_config : null,
    in_stock: raw.in_stock === true || raw.in_stock === "on",
    featured: raw.featured === true || raw.featured === "on",
    show_on_homepage: raw.show_on_homepage === true || raw.show_on_homepage === "on",
    show_in_related: raw.show_in_related === true || raw.show_in_related === "on",
    sort_order: Number(raw.sort_order) || 0,
  };
}

function validate(p: ProductInput): string | null {
  if (!p.name) return "Name is required.";
  if (!Number.isFinite(p.price) || p.price < 0) return "Price must be a non-negative number.";
  if (!p.category) return "Category is required.";
  return null;
}

function missingVariationColumn(error: any): boolean {
  const msg = String(error?.message || "");
  return msg.includes("variation_config") && /column|schema|cache/i.test(msg);
}

function withoutVariationConfig(p: ProductInput) {
  const { variation_config, ...rest } = p;
  return rest;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async create(body: any) {
    const p = normalize(body);
    const err = validate(p);
    if (err) throw new BadRequestException(err);

    const supabase = this.supabase.admin();
    const id = await ensureUniqueSlug(supabase, "products", "id", slugify(p.name));

    let { error } = await supabase.from("products").insert({ id, ...p });
    if (error && missingVariationColumn(error)) {
      ({ error } = await supabase.from("products").insert({ id, ...withoutVariationConfig(p) }));
    }
    if (error) throw new InternalServerErrorException(error.message);

    await this.syncReviewsSafely(supabase, id, p.name, body.product_reviews);
    return { ok: true, id };
  }

  async update(originalId: string, body: any) {
    if (!originalId) throw new BadRequestException("Missing original id.");
    const p = normalize(body);
    const err = validate(p);
    if (err) throw new BadRequestException(err);

    const supabase = this.supabase.admin();
    let { error } = await supabase.from("products").update(p).eq("id", originalId);
    if (error && missingVariationColumn(error)) {
      ({ error } = await supabase.from("products").update(withoutVariationConfig(p)).eq("id", originalId));
    }
    if (error) throw new InternalServerErrorException(error.message);

    await this.syncReviewsSafely(supabase, originalId, p.name, body.product_reviews);
    return { ok: true, id: originalId };
  }

  async remove(id: string) {
    if (!id) throw new BadRequestException("Missing id.");
    const { error } = await this.supabase.admin().from("products").delete().eq("id", id);
    if (error) throw new InternalServerErrorException(error.message);
    return { ok: true, id };
  }

  private async syncReviewsSafely(supabase: SupabaseClient, productId: string, productName: string, rawReviews: unknown) {
    try {
      await this.syncProductReviews(supabase, productId, productName, this.parseReviews(rawReviews));
    } catch (e) {
      this.logger.error(`product reviews sync failed: ${(e as Error).message}`);
    }
  }

  private parseReviews(raw: unknown): ReviewInput[] {
    const arr = Array.isArray(raw) ? raw : [];
    return arr
      .map((r: any) => ({
        id: typeof r.id === "string" ? r.id : undefined,
        name: String(r.name || "").trim(),
        initials: String(r.initials || "").trim().slice(0, 4),
        color: String(r.color || "var(--brand-soft)"),
        rating: Math.max(1, Math.min(5, Number(r.rating) || 5)),
        text: String(r.text || "").trim(),
        approved: r.approved !== false,
      }))
      .filter((r) => r.name && r.text);
  }

  private async syncProductReviews(supabase: SupabaseClient, productId: string, productName: string, reviews: ReviewInput[]) {
    const { data: existing } = await supabase.from("reviews").select("id").eq("product_id", productId);
    const existingIds: string[] = (existing ?? []).map((r: any) => r.id);
    const submittedIds = new Set(reviews.map((r) => r.id).filter(Boolean) as string[]);

    const toDelete = existingIds.filter((id) => !submittedIds.has(id));
    if (toDelete.length > 0) await supabase.from("reviews").delete().in("id", toDelete);

    for (const r of reviews) {
      const row = {
        ...(r.id ? { id: r.id } : {}),
        name: r.name,
        initials: r.initials,
        color: r.color,
        rating: r.rating,
        text: r.text,
        approved: r.approved,
        product_id: productId,
        product_name: productName,
      };
      if (r.id) await supabase.from("reviews").update(row).eq("id", r.id);
      else await supabase.from("reviews").insert(row);
    }
  }
}
