import { Controller, Get } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

@Controller()
export class HealthController {
  constructor(private readonly supabase: SupabaseService) {}

  /** Liveness probe for Render. Cheap, no external calls. */
  @Get("health")
  health() {
    return {
      ok: true,
      service: "subscribai-api",
      time: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    };
  }

  /**
   * Readiness probe — confirms Supabase credentials actually work by doing a
   * tiny round trip. Useful right after deploy to catch a bad env var.
   */
  @Get("health/ready")
  async ready() {
    try {
      const { error } = await this.supabase.admin().from("admins").select("user_id").limit(1);
      return { ok: !error, supabase: error ? "error" : "connected", detail: error?.message };
    } catch (err) {
      return { ok: false, supabase: "error", detail: (err as Error).message };
    }
  }
}
