import { NextResponse } from "next/server";
import { requireUser } from "@/lib/data/auth";
import { readJson, route } from "@/lib/security/errors";
import { rateLimit } from "@/lib/security/rateLimit";
import { profileSchema } from "@/lib/security/schemas";

export const GET = route(async () => {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error) throw error;
  return NextResponse.json({ data: { ...data, email: user.email } });
});

export const PATCH = route(async (req) => {
  const { supabase, user } = await requireUser();
  await rateLimit("WRITE", user.id);
  const body = profileSchema.parse(await readJson(req));
  const { data, error } = await supabase.from("profiles").update(body).eq("id", user.id).select().single();
  if (error) throw error;
  return NextResponse.json({ data });
});
