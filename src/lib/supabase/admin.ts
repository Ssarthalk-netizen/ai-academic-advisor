import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "../env";
import { SUPABASE_URL } from "./public-env";

/**
 * Service-role client. BYPASSES Row Level Security, so it is only used for
 * three narrow jobs: rate limiting, deleting an account, and nothing that
 * returns another user's data. Never import this from client code.
 */
export function createAdminClient() {
  const e = env();
  return createClient(SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
