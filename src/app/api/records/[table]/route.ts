import { NextResponse } from "next/server";
import { requireUser } from "@/lib/data/auth";
import { ApiError, readJson, route } from "@/lib/security/errors";
import { rateLimit } from "@/lib/security/rateLimit";
import { isRecordTable, RECORD_SCHEMAS } from "@/lib/security/schemas";

type Ctx = { params: Promise<{ table: string }> };

/** List rows of one of the student's record tables. */
export const GET = route<Ctx>(async (_req, { params }) => {
  const { table } = await params;
  if (!isRecordTable(table)) throw new ApiError(404, "Unknown record type.");
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from(table).select("*").order("created_at").limit(500);
  if (error) throw error;
  return NextResponse.json({ data });
});

/** Create a row. user_id is never taken from the client: the DB default is auth.uid(). */
export const POST = route<Ctx>(async (req, { params }) => {
  const { table } = await params;
  if (!isRecordTable(table)) throw new ApiError(404, "Unknown record type.");
  const { supabase, user } = await requireUser();
  await rateLimit("WRITE", user.id);
  const body = RECORD_SCHEMAS[table].parse(await readJson(req)) as Record<string, unknown>;
  if (table === "semesters" && (body as { is_current?: boolean }).is_current) {
    await supabase.from("semesters").update({ is_current: false }).eq("user_id", user.id);
  }
  const { data, error } = await supabase.from(table).insert(body).select().single();
  if (error) {
    if (error.code === "23505") throw new ApiError(409, "That already exists.");
    if (error.code === "P0001" || error.code === "23514") throw new ApiError(400, "Those values aren't allowed.");
    throw error;
  }
  return NextResponse.json({ data }, { status: 201 });
});
