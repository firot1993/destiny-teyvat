import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy-initialized Supabase client. Returns null when SUPABASE_URL /
// SUPABASE_SERVICE_ROLE_KEY are unset so local dev (and CI) work without a DB
// — mirrors the graceful-degradation pattern in `lib/rateLimit.ts`.
let _client: SupabaseClient | null | undefined;

export function getDb(): SupabaseClient | null {
  if (_client === undefined) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    _client = url && key
      ? createClient(url, key, { auth: { persistSession: false } })
      : null;
  }
  return _client;
}
