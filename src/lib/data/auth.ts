import "server-only";
import { createClient } from "../supabase/server";
import { ApiError } from "../security/errors";

/** Data Access Layer entry point: verifies the session with Supabase on every call. */
export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new ApiError(401, "Please sign in again.", "unauthorized");
  return { supabase, user: data.user };
}
