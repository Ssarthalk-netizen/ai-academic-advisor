import { NextResponse } from "next/server";
import { requireUser } from "@/lib/data/auth";
import { loadRecord } from "@/lib/data/record";
import { generatePlan } from "@/lib/academics/planner";
import { readJson, route } from "@/lib/security/errors";
import { rateLimit } from "@/lib/security/rateLimit";
import { planSchema } from "@/lib/security/schemas";

/** Generate (or regenerate) the adaptive plan from today. Completed sessions are never touched. */
export const POST = route(async (req) => {
  const { supabase, user } = await requireUser();
  await rateLimit("WRITE", user.id);
  const opts = planSchema.parse(await readJson(req));
  const rec = await loadRecord(supabase, user.id);
  const plan = generatePlan(rec, { days: opts.days ?? 7, minutesPerDay: opts.minutes_per_day });
  const today = new Date().toISOString().slice(0, 10);

  const del = await supabase.from("study_sessions").delete()
    .eq("user_id", user.id).eq("status", "planned").eq("source", "planner").gte("planned_date", today);
  if (del.error) throw del.error;
  if (plan.sessions.length) {
    const { error } = await supabase.from("study_sessions").insert(
      plan.sessions.map((s) => ({ subject_id: s.subject_id, topic: s.topic, planned_date: s.planned_date, planned_minutes: s.planned_minutes, source: "planner" })),
    );
    if (error) throw error;
  }
  return NextResponse.json(plan);
});
