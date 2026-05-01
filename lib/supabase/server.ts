import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cookie-aware Supabase client for Server Components, Server Actions, and Route Handlers.
// Carries the user's auth session — used to enforce admin gates via RLS / is_admin().
export async function getSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(items) {
          // Server Components can't set cookies; ignore failures.
          try {
            items.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // No-op in Server Components.
          }
        },
      },
    },
  );
}
