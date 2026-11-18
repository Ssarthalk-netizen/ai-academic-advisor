import { NextResponse } from "next/server";
import { requireUser } from "@/lib/data/auth";
import { AI_LABEL, generate } from "@/lib/ai/gemini";
import { EXPLAIN_MODES } from "@/lib/ai/prompts";
import { ApiError, readJson, route } from "@/lib/security/errors";
import { rateLimit } from "@/lib/security/rateLimit";
import { explainSchema } from "@/lib/security/schemas";

/** "Explain it differently": the same topic in beginner / example / exam / deep / visual styles. */
export const POST = route(async (req) => {
  const { supabase, user } = await requireUser();
  const { topic, subject, mode } = explainSchema.parse(await readJson(req));
  const { data: p } = await supabase.from("profiles").select("ai_consent,degree,branch").eq("id", user.id).single();
  if (!p?.ai_consent) throw new ApiError(403, "Allow AI processing in Settings → Privacy to use explanations.", "no_consent");
  await rateLimit("AI", user.id);
  await rateLimit("AI_DAILY", user.id);
  const out = await generate({
    system: `You are a patient university tutor for a ${p.degree ?? "university"} ${p.branch ?? ""} student. Be accurate; if unsure, say so. ${EXPLAIN_MODES[mode]}`,
    prompt: `Explain: ${topic}${subject ? ` (subject: ${subject})` : ""}`,
    maxTokens: mode === "deep" ? 1600 : 1000,
  });
  return NextResponse.json({ text: out.text, label: AI_LABEL, model: out.model });
});
