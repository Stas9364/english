import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | null | undefined;

/**
 * Supabase client with service_role key for server-only operations (bypasses RLS).
 * Returns null when SUPABASE_SERVICE_ROLE_KEY is not configured.
 */
export function createServiceClient(): SupabaseClient | null {
  if (serviceClient !== undefined) {
    return serviceClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    serviceClient = null;
    return serviceClient;
  }

  serviceClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serviceClient;
}
