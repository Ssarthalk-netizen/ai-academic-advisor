import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApiError, readJson, route } from "@/lib/security/errors";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { authSchema } from "@/lib/security/schemas";

/** Email + password sign-in, rate-limited per IP and per account. */
export const POST = route(async (req) => {
  const { email, password } = authSchema.omit({ full_name: true }).parse(await readJson(req));
  await rateLimit("AUTH", `ip:${clientIp(req)}`);
  await rateLimit("AUTH_ACCOUNT", `acct:${email.toLowerCase()}`);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // Same message for wrong email and wrong password (no account enumeration)
  if (error) console.warn("[auth]", error.status, error.code, error.message);
  if (error && (error.code === "email_not_confirmed" || /not confirmed/i.test(error.message)))
    throw new ApiError(403, "Please confirm your email first: open the link we sent to your inbox (check spam too).", "email_not_confirmed");
  if (error?.status === 429) throw new ApiError(429, "Too many requests. Please wait a few minutes and try again.", "rate_limited");
  if (error) throw new ApiError(401, "Incorrect email or password.", "bad_credentials");
  return NextResponse.json({ ok: true });
});
