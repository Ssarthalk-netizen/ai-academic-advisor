import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readJson, route } from "@/lib/security/errors";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { emailSchema } from "@/lib/security/schemas";

/** Sends a reset link. Always answers the same way so it can't reveal which emails exist. */
export const POST = route(async (req) => {
  const { email } = emailSchema.parse(await readJson(req));
  await rateLimit("AUTH", `ip:${clientIp(req)}`);
  await rateLimit("AUTH", `reset:${email.toLowerCase()}`);
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${new URL(req.url).origin}/auth/callback?next=/reset-password` });
  return NextResponse.json({ ok: true, message: "If an account exists for that email, a reset link is on its way." });
});
