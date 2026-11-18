import { NextResponse } from "next/server";
import { requireUser } from "@/lib/data/auth";
import { loadRecord } from "@/lib/data/record";
import { aiContext } from "@/lib/academics/insights";
import { AI_LABEL, generate, parseJson } from "@/lib/ai/gemini";
import { REPORT_SYSTEM } from "@/lib/ai/prompts";
import { ApiError, route } from "@/lib/security/errors";
import { rateLimit } from "@/lib/security/rateLimit";

export const POST = route(async () => {
  const { supabase, user } = await requireUser();
  const rec = await loadRecord(supabase, user.id);
  if (!rec.profile.ai_consent) throw new ApiError(403, "Allow AI processing in Settings → Privacy to generate reports.", "no_consent");
  await rateLimit("AI", user.id);
  await rateLimit("AI_DAILY", user.id);
  const week = rec.sessions.filter((s) => new Date(s.planned_date).getTime() > Date.now() - 7 * 864e5);
  const study = {
    planned_minutes: week.reduce((s, x) => s + x.planned_minutes, 0),
    completed_minutes: week.filter((s) => s.status === "done").reduce((s, x) => s + (x.actual_minutes ?? x.planned_minutes), 0),
    missed_sessions: week.filter((s) => s.status === "missed").length,
  };
  const out = await generate({ system: REPORT_SYSTEM, json: true, prompt: `STUDENT_CONTEXT: ${JSON.stringify({ ...aiContext(rec), study_last_7_days: study })}` });
  const report = parseJson<Record<string, unknown>>(out.text);
  await supabase.from("ai_recommendations").insert({ kind: "weekly_report", content: report, evidence: [study] });
  return NextResponse.json({ report, study, label: AI_LABEL });
});
