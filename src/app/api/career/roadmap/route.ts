import { NextResponse } from "next/server";
import { requireUser } from "@/lib/data/auth";
import { loadRecord } from "@/lib/data/record";
import { aiContext } from "@/lib/academics/insights";
import { CAREER_PATHS, skillGap } from "@/lib/academics/careers";
import { AI_LABEL, generate, parseJson } from "@/lib/ai/gemini";
import { CAREER_SYSTEM } from "@/lib/ai/prompts";
import { ApiError, readJson, route } from "@/lib/security/errors";
import { rateLimit } from "@/lib/security/rateLimit";
import { careerAdviceSchema } from "@/lib/security/schemas";

export const POST = route(async (req) => {
  const { supabase, user } = await requireUser();
  const { path_id } = careerAdviceSchema.parse(await readJson(req));
  const path = CAREER_PATHS.find((p) => p.id === path_id);
  if (!path) throw new ApiError(404, "Unknown career path.");
  const rec = await loadRecord(supabase, user.id);
  if (!rec.profile.ai_consent) throw new ApiError(403, "Allow AI processing in Settings → Privacy to generate a roadmap.", "no_consent");
  await rateLimit("AI", user.id);
  await rateLimit("AI_DAILY", user.id);
  const out = await generate({
    system: CAREER_SYSTEM, json: true, maxTokens: 1500,
    prompt: `STUDENT_CONTEXT: ${JSON.stringify(aiContext(rec))}\nCAREER_PATH: ${JSON.stringify({ title: path.title, sequence: path.sequence, projects: path.projects, skill_gaps: skillGap(path, rec.skills) })}`,
  });
  const roadmap = parseJson<Record<string, unknown>>(out.text);
  await supabase.from("ai_recommendations").insert({ kind: "career", content: { path: path.id, ...roadmap }, evidence: skillGap(path, rec.skills) });
  return NextResponse.json({ roadmap, label: AI_LABEL, model: out.model });
});
