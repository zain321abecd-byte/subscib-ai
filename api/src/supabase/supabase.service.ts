import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Central Supabase access for the backend.
 *
 * Two distinct clients, mirroring how the Next.js app used them:
 *
 *  - admin()  → service-role key. BYPASSES Row Level Security. Use only in
 *               trusted server contexts (recording orders, cron, uploads).
 *               Cached as a singleton.
 *
 *  - forUser(accessToken) → anon key + the caller's Supabase access token in
 *               the Authorization header. Runs UNDER RLS as that user, and lets
 *               us resolve the authenticated user (getUser) the way the old
 *               cookie-based getSupabaseServer() did — but via Bearer token,
 *               since the API is now a separate origin from the frontend.
 */
@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private adminClient: SupabaseClient | null = null;

  private readonly url: string;
  private readonly anonKey: string;
  private readonly serviceRoleKey: string;

  constructor(private readonly config: ConfigService) {
    this.url = this.config.get<string>("SUPABASE_URL", "");
    this.anonKey = this.config.get<string>("SUPABASE_ANON_KEY", "");
    this.serviceRoleKey = this.config.get<string>("SUPABASE_SERVICE_ROLE_KEY", "");
  }

  /** Service-role client (bypasses RLS). Singleton. */
  admin(): SupabaseClient {
    if (this.adminClient) return this.adminClient;
    this.adminClient = createClient(this.url, this.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return this.adminClient;
  }

  /**
   * Per-request client scoped to the caller's session. Pass the Supabase
   * access token from the request's `Authorization: Bearer <token>` header.
   * Returns a fresh client each call (do not cache — it carries user state).
   */
  forUser(accessToken: string): SupabaseClient {
    return createClient(this.url, this.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
  }

  /** Resolve the authenticated user from an access token, or null. */
  async getUser(accessToken: string | undefined | null) {
    if (!accessToken) return null;
    try {
      const { data, error } = await this.admin().auth.getUser(accessToken);
      if (error) return null;
      return data.user ?? null;
    } catch (err) {
      this.logger.warn(`getUser failed: ${(err as Error).message}`);
      return null;
    }
  }
}
