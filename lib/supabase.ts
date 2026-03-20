import { createClient } from "@supabase/supabase-js";

/**
 * Returns a Supabase client, or null if env vars are not configured.
 * Lazy — never throws at module load time so the build doesn't crash
 * when NEXT_PUBLIC_SUPABASE_* vars are absent.
 */
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
