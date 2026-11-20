import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApiError, readJson, route } from "@/lib/security/errors";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { authSchema } from "@/lib/security/schemas";

const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;

export const POST = route(async (req) => {
  const { email, password, full_name } = authSchema.parse(await readJson(req));
  if (!STRONG.test(password)) throw new ApiError(400, "Password needs 8+ characters with upper-case, lower-case and a number.", "weak_password");
  await rateLimit("AUTH", `ip:${clientIp(req)}`);
  const supabase = await createClient();
  const origin = new URL(req.url).origin;
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: full_name ?? "" }, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) console.warn("[auth]", error.status, error.code, error.message);
  if (error) {
    if (/already registered/i.test(error.message)) throw new ApiError(409, "An account with this email already exists. Try signing in.");
    if (error.status === 429 || /rate limit/i.test(error.message)) throw new ApiError(429, "Too many sign-ups right now. Please wait a few minutes, or use the demo account.", "rate_limited");
    if (/password/i.test(error.message)) throw new ApiError(400, "That password isn't allowed. Try a stronger one.");
    throw new ApiError(400, "Could not create the account. Please try again.");
  }
  return NextResponse.json({ ok: true, needsConfirmation: !data.session });
});
