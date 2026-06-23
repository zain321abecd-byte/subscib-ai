import { Logger } from "@nestjs/common";

/**
 * Validates environment variables at boot. We WARN (not crash) on missing
 * Supabase config so the service still boots in local dev with only a subset
 * configured — mirroring the Next.js app, which gracefully degrades (static
 * fallbacks, "supabase_not_configured" no-ops) when Supabase isn't set.
 *
 * Endpoints that genuinely need a given secret fail per-request with a clear
 * message (e.g. payments → "PayFast is not configured").
 */
export function validateEnv(config: Record<string, unknown>) {
  const logger = new Logger("EnvValidation");
  const recommended = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];

  const missing = recommended.filter((key) => {
    const value = config[key];
    return value === undefined || value === null || String(value).trim() === "";
  });

  if (missing.length > 0) {
    logger.warn(
      `Supabase env not fully set (${missing.join(", ")}). DB-backed endpoints ` +
        `(orders, stock, admin, traffic) will be unavailable until configured.`,
    );
  }

  return config;
}
