import { createClient } from "@supabase/supabase-js";

/**
 * Public client — uses the anon key, subject to RLS.
 * Safe for reads and untrusted inserts from the public submit form.
 */
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: (url, opts) => fetch(url, { ...opts, cache: "no-store" }) },
  });
}

/**
 * Admin client — uses the service role key, bypasses RLS entirely.
 * Only use in server-side API routes that have already verified the admin PIN.
 * Falls back to the anon client if SUPABASE_SERVICE_ROLE_KEY is not set.
 */
export function getSupabaseAdmin() {
  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key        = serviceKey ?? anonKey;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, opts) => fetch(url, { ...opts, cache: "no-store" }) },
  });
}
