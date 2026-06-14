import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

@Injectable()
export class SettingsService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Save a subset of site settings. Accepts either:
   *   { settings: { key: value, ... } }   (preferred JSON shape), or
   *   { key: value, ... }                  (flat object)
   * Boolean "on" is normalised to "true" for parity with the old form path.
   */
  async save(body: any) {
    const source = body?.settings && typeof body.settings === "object" ? body.settings : body;
    if (!source || typeof source !== "object") throw new BadRequestException("Nothing to save.");

    const updates = Object.entries(source)
      .filter(([key]) => key && key !== "__return_to")
      .map(([key, value]) => ({ key, value: value === "on" ? "true" : String(value) }));

    if (updates.length === 0) throw new BadRequestException("Nothing to save.");

    const { error } = await this.supabase.admin().from("site_settings").upsert(updates, { onConflict: "key" });
    if (error) throw new InternalServerErrorException(error.message);
    return { ok: true, saved: updates.length };
  }
}
