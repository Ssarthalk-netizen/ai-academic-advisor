import { NextResponse } from "next/server";
import { requireUser } from "@/lib/data/auth";
import { loadRecord } from "@/lib/data/record";
import { completedGraded } from "@/lib/academics/analytics";
import { requiredForTarget } from "@/lib/academics/grading";
import { readJson, route } from "@/lib/security/errors";
import { targetSchema } from "@/lib/security/schemas";

/** "What do I need to reach my CGPA target?" Pure maths, no AI. */
export const POST = route(async (req) => {
  const { supabase, user } = await requireUser();
  const { target, remaining_credits } = targetSchema.parse(await readJson(req));
  const rec = await loadRecord(supabase, user.id);
  return NextResponse.json(requiredForTarget(completedGraded(rec), remaining_credits, target));
});
