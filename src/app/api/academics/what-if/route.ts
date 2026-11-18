import { NextResponse } from "next/server";
import { requireUser } from "@/lib/data/auth";
import { loadRecord } from "@/lib/data/record";
import { completedGraded } from "@/lib/academics/analytics";
import { whatIf } from "@/lib/academics/grading";
import { readJson, route } from "@/lib/security/errors";
import { whatIfSchema } from "@/lib/security/schemas";

/** What-If simulator: hypothetical current-semester marks -> projected SGPA/CGPA. Pure maths. */
export const POST = route(async (req) => {
  const { supabase, user } = await requireUser();
  const { subjects } = whatIfSchema.parse(await readJson(req));
  const rec = await loadRecord(supabase, user.id);
  return NextResponse.json(whatIf(completedGraded(rec), subjects));
});
