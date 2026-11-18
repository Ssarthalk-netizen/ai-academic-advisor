import { NextResponse } from "next/server";
import { requireUser } from "@/lib/data/auth";
import { loadRecord } from "@/lib/data/record";
import { computeInsights } from "@/lib/academics/insights";
import { route } from "@/lib/security/errors";

/** Everything the dashboard needs. Also records a risk snapshot at most every 12 h for the trend chart. */
export const GET = route(async () => {
  const { supabase, user } = await requireUser();
  const rec = await loadRecord(supabase, user.id);
  const insights = computeInsights(rec);

  const { data: history } = await supabase
    .from("risk_snapshots").select("probability,level,created_at").order("created_at", { ascending: false }).limit(30);
  const last = history?.[0];
  const risk = insights.wrong.risk;
  if (risk && (!last || Date.now() - new Date(last.created_at).getTime() > 12 * 3600e3 || Math.abs(Number(last.probability) - risk.probability) > 0.05)) {
    await supabase.from("risk_snapshots").insert({
      probability: Number(risk.probability.toFixed(4)), level: risk.level, model: risk.model,
      factors: risk.factors.map((f) => ({ label: f.label, value: f.value, typical: f.typical })),
    });
  }
  return NextResponse.json({
    profile: rec.profile,
    insights,
    riskHistory: (history ?? []).reverse().map((h) => ({ ...h, probability: Number(h.probability) })),
    empty: rec.subjects.length === 0,
  });
});
