import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Plain, cookie-free Supabase client for public read-only content
 * (productions, people). The public site has no user sessions, so this
 * intentionally avoids next/headers' cookies() — reading it (as the
 * SSR client in supabase/server.ts does) forces every page that calls it
 * into fully dynamic, per-request rendering, which silently overrides
 * any `revalidate`/ISR config on the page.
 */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
