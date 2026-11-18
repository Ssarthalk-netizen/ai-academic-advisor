import { NextResponse } from "next/server";
import { requireUser } from "@/lib/data/auth";
import { loadRecord } from "@/lib/data/record";
import { aiContext, computeInsights } from "@/lib/academics/insights";
import { classifyIntent, INTENT_THRESHOLD, intentResponse } from "@/lib/ml/intent";
import { recommendCourses } from "@/lib/ml/recommender";
import { AI_LABEL, generate } from "@/lib/ai/gemini";
import { ADVISOR_SYSTEM, EXPLAIN_MODES, SUPPORT_MESSAGE } from "@/lib/ai/prompts";
import { readJson, route } from "@/lib/security/errors";
import { rateLimit } from "@/lib/security/rateLimit";
import { chatSchema } from "@/lib/security/schemas";

/**
 * Module router (synopsis architecture):
 *   1. ML intent classifier (TF-IDF + Logistic Regression) labels the message.
 *   2. Wellbeing / "talk to a human" intents -> fixed support message + escalation flag.
 *   3. Confident FAQ intents -> answered from the knowledge base (no AI call).
 *   4. Risk / course / career intents and low-confidence messages -> Gemini,
 *      grounded in the student's records and the outputs of the ML modules.
 */
export const GET = route(async () => {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("chat_messages").select("id,role,content,intent,confidence,escalated,created_at")
    .order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return NextResponse.json({ data: (data ?? []).reverse() });
});

export const DELETE = route(async () => {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("chat_messages").delete().eq("user_id", user.id);
  if (error) throw error;
  return NextResponse.json({ ok: true });
});

export const POST = route(async (req) => {
  const { supabase, user } = await requireUser();
  const { message, mode = "default" } = chatSchema.parse(await readJson(req, 8000));
  const cls = classifyIntent(message);

  let reply: string;
  let source: "support" | "faq" | "ai" | "module";
  let escalated = false;
  let model: string | undefined;

  const kb = cls.inScope ? intentResponse(cls.intent) : undefined;
  if (cls.inScope && kb === "__ESCALATE__") {
    reply = SUPPORT_MESSAGE;
    source = "support";
    escalated = true;
  } else if (cls.inScope && kb && !kb.startsWith("__") && mode === "default") {
    reply = `${kb}\n\n_General university information. Check your own college's portal for exact rules._`;
    source = "faq";
  } else {
    const rec = await loadRecord(supabase, user.id);
    const extra: Record<string, unknown> = {};
    if (cls.intent === "course_recommendation" || cls.intent === "career_guidance") {
      const recs = recommendCourses({ interests: [...rec.profile.interests, message], goal: rec.profile.career_goal ?? undefined, limit: 4 });
      extra.recommended_courses = {
        electives: recs.electives.map((c) => c.title),
        online: recs.online.map((c) => `${c.title} (${c.level})`),
      };
    }
    if (!rec.profile.ai_consent) {
      // Deterministic fallback when the student hasn't consented to AI processing
      const ins = computeInsights(rec);
      source = "module";
      if (cls.intent === "academic_risk" && ins.wrong.risk) {
        reply = `Your estimated academic risk is **${ins.wrong.risk.level}** (${Math.round(ins.wrong.risk.probability * 100)}%). Top factors: ${ins.wrong.risk.factors.slice(0, 3).map((f) => f.label).join(", ") || "none"}. See the Risk Radar page for details.`;
      } else if (extra.recommended_courses) {
        const r = extra.recommended_courses as { electives: string[]; online: string[] };
        reply = `Based on your interests, consider: ${[...r.electives, ...r.online].slice(0, 5).join("; ")}.`;
      } else {
        reply = "I can answer this with AI once you allow AI processing in **Settings → Privacy**. Until then I can help with FAQs, your risk level and course suggestions.";
      }
    } else {
      await rateLimit("AI", user.id);
      await rateLimit("AI_DAILY", user.id);
      const { data: history } = await supabase
        .from("chat_messages").select("role,content").order("created_at", { ascending: false }).limit(8);
      const turns = (history ?? []).reverse().map((m) => ({ role: (m.role === "assistant" ? "model" : "user") as "user" | "model", text: m.content.slice(0, 1500) }));
      const ctx = JSON.stringify({ ...aiContext(rec), ...extra });
      const style = EXPLAIN_MODES[mode] ? `\nAnswer style: ${EXPLAIN_MODES[mode]}` : "";
      const out = await generate({
        system: `${ADVISOR_SYSTEM}\n\nSTUDENT_CONTEXT: ${ctx}\nDetected intent: ${cls.intent} (confidence ${cls.confidence.toFixed(2)}).${style}`,
        prompt: [...turns, { role: "user", text: message }],
        maxTokens: mode === "deep" ? 1600 : 900,
      });
      reply = out.text;
      model = out.model;
      source = "ai";
    }
  }

  await supabase.from("chat_messages").insert([
    { role: "user", content: message, intent: cls.intent, confidence: Number(cls.confidence.toFixed(4)) },
    { role: "assistant", content: reply.slice(0, 8000), intent: cls.intent, escalated },
  ]);

  return NextResponse.json({
    reply,
    source,
    escalated,
    model,
    label: source === "ai" ? AI_LABEL : undefined,
    intent: { name: cls.intent, confidence: cls.confidence, threshold: INTENT_THRESHOLD, inScope: cls.inScope },
  });
});
