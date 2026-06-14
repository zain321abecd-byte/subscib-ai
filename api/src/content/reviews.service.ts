import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

type ReviewInput = {
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
};

function normalize(raw: any): ReviewInput {
  const str = (k: string) => String(raw?.[k] ?? "").trim();
  const num = (k: string) => Number(raw?.[k] ?? 0);
  return {
    name: str("name"),
    initials: str("initials").slice(0, 4),
    color: str("color") || null,
    photo_url: str("photo_url") || null,
    rating: num("rating") || 5,
    text: str("text"),
    product_id: str("product_id") || null,
    product_name: str("product_name") || null,
    approved: raw?.approved === true || raw?.approved === "on",
    sort_order: num("sort_order"),
  };
}

@Injectable()
export class ReviewsService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(body: any) {
    const r = normalize(body);
    if (!r.name) throw new BadRequestException("Name is required.");
    if (!r.text) throw new BadRequestException("Review text is required.");
    if (r.rating < 1 || r.rating > 5) throw new BadRequestException("Rating must be 1–5.");
    const { error } = await this.supabase.admin().from("reviews").insert(r);
    if (error) throw new InternalServerErrorException(error.message);
    return { ok: true };
  }

  async update(id: string, body: any) {
    if (!id) throw new BadRequestException("Missing review id.");
    const r = normalize(body);
    if (!r.name || !r.text) throw new BadRequestException("Name and text are required.");
    const { error } = await this.supabase.admin().from("reviews").update(r).eq("id", id);
    if (error) throw new InternalServerErrorException(error.message);
    return { ok: true };
  }

  async remove(id: string) {
    if (!id) throw new BadRequestException("Missing review id.");
    const { error } = await this.supabase.admin().from("reviews").delete().eq("id", id);
    if (error) throw new InternalServerErrorException(error.message);
    return { ok: true };
  }
}
