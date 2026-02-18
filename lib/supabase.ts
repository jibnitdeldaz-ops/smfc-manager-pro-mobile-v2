import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Important: don't throw at import-time. Builds (and prerendering) should succeed
  // even if env vars are not configured yet (e.g. on Vercel).
  if (!supabaseUrl || !supabaseAnonKey) return null;

  if (_client) return _client;
  _client = createClient(supabaseUrl, supabaseAnonKey);
  return _client;
}
