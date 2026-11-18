import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/data/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJson, route } from "@/lib/security/errors";

/**
 * Account deletion: removes uploaded files, then the auth user. Every table
 * row is deleted automatically by ON DELETE CASCADE.
 */
export const DELETE = route(async (req) => {
  const { supabase, user } = await requireUser();
  z.strictObject({ confirm: z.literal("DELETE") }).parse(await readJson(req));
  const admin = createAdminClient();
  const { data: files } = await admin.storage.from("documents").list(user.id, { limit: 1000 });
  if (files?.length) await admin.storage.from("documents").remove(files.map((f) => `${user.id}/${f.name}`));
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
});
