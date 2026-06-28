import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS. SERVER ONLY.
 *
 * Used to read public.users (which has RLS with no policies, so neither the
 * anon nor the authenticated client can touch it) when resolving a back-office
 * user's role/permissions. Never import this into a client component.
 *
 * Works in both the Node.js and Edge runtimes (supabase-js uses fetch), so the
 * middleware and Server Components can share one resolver.
 */
let cached: SupabaseClient<any> | null = null;

export function hasServiceRole(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAdmin(): SupabaseClient<any> {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Service-role Supabase client unavailable: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  cached = createClient<any>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
