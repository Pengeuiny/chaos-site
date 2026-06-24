import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for ADMIN/server use only. Bypasses RLS, so it
 * must never be imported into client components or exposed to the browser.
 * Returns null when the service-role key isn't configured.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
