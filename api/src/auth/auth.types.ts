import type { Request } from "express";
import type { User } from "@supabase/supabase-js";

/**
 * Request augmented by the auth guards. After AuthGuard/AdminGuard runs,
 * `user` and `accessToken` are populated.
 */
export interface AuthedRequest extends Request {
  user?: User;
  accessToken?: string;
}

/** Pull the Bearer token out of the Authorization header, or null. */
export function extractBearerToken(req: Request): string | null {
  const header = req.headers["authorization"] || req.headers["Authorization" as keyof typeof req.headers];
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return null;
  const [scheme, token] = value.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}
