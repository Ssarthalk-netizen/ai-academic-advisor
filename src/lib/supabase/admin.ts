import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "../env";

/**
 * Service-role client. BYPASSES Row Level Security, so it is only used for
 * three narrow jobs: rate limiting, deleting an account, and nothing that
 * returns another user's data. Never import this from client code.
 */
export function createAdminClient() {
  const e = env();
  return createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
