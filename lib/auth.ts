import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * Read the current Supabase Auth user from the server (uses cookies).
 * Returns null if no session.
 */
export async function getCustomer() {
  try {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
}

/**
 * Hard-redirect to /login if no session. Use in pages that strictly require
 * a logged-in customer (account, checkout). Pass `next` to come back after
 * sign-in.
 */
export async function requireCustomer(redirectTo: string) {
  const user = await getCustomer();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(redirectTo)}`);
  }
  return user;
}
