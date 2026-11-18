import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { route } from "@/lib/security/errors";

export const POST = route(async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
});
