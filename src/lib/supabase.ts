import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

interface SupabaseOptions {
  headers?: Record<string, string>;
}

/**
 * Public Supabase client (anon key).
 * Use for read-only public queries (gallery images, site settings).
 * RLS policies restrict this client to SELECT only.
 * Lazy-initialized to avoid build-time errors.
 */
export function getSupabase(options?: SupabaseOptions): SupabaseClient {
  if (options?.headers && Object.keys(options.headers).length > 0) {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: options.headers,
        },
      }
    );
  }

  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}

