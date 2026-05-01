import { createClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS — use only in server-side trusted contexts:
//   - /api routes that record orders from anonymous customers
//   - Seed scripts
// Never import this from a Client Component.
let cached: ReturnType<typeof createClient<any>> | null = null;

export function getSupabaseAdmin() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase admin client missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  cached = createClient<any>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
