import { NextResponse } from "next/server";
import { requireUser } from "@/lib/data/auth";
import { ApiError, readJson, route } from "@/lib/security/errors";
import { rateLimit } from "@/lib/security/rateLimit";
import { idParam, isRecordTable, RECORD_SCHEMAS } from "@/lib/security/schemas";

type Ctx = { params: Promise<{ table: string; id: string }> };

async function parseParams(params: Ctx["params"]) {
  const { table, id } = await params;
  if (!isRecordTable(table)) throw new ApiError(404, "Unknown record type.");
  if (!idParam.safeParse(id).success) throw new ApiError(400, "Invalid id.");
  return { table, id };
}

/** Update a row the student owns (RLS makes other users' rows invisible). */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const { table, id } = await parseParams(params);
  const { supabase, user } = await requireUser();
  await rateLimit("WRITE", user.id);
  const body = RECORD_SCHEMAS[table].partial().parse(await readJson(req)) as Record<string, unknown>;
  if (Object.keys(body).length === 0) throw new ApiError(400, "Nothing to update.");
  if (table === "semesters" && (body as { is_current?: boolean }).is_current) {
    await supabase.from("semesters").update({ is_current: false }).eq("user_id", user.id).neq("id", id);
  }
  const { data, error } = await supabase.from(table).update(body).eq("id", id).select().maybeSingle();
  if (error) {
    if (error.code === "P0001" || error.code === "23514") throw new ApiError(400, "Those values aren't allowed.");
    throw error;
  }
  if (!data) throw new ApiError(404, "Not found.");
  return NextResponse.json({ data });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { table, id } = await parseParams(params);
  const { supabase, user } = await requireUser();
  await rateLimit("WRITE", user.id);
  const { data, error } = await supabase.from(table).delete().eq("id", id).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "Not found.");
  return NextResponse.json({ ok: true });
});
