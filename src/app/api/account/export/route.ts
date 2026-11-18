import { NextResponse } from "next/server";
import { requireUser } from "@/lib/data/auth";
import { route } from "@/lib/security/errors";

const TABLES = ["semesters", "subjects", "assessments", "assignments", "exams", "study_sessions", "goals", "skills", "risk_snapshots", "chat_messages", "ai_recommendations", "documents"];

/** Data export (privacy right): every row the student owns, as a JSON download. */
export const GET = route(async () => {
  const { supabase, user } = await requireUser();
  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), account: { id: user.id, email: user.email } };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  out.profile = profile;
  for (const t of TABLES) {
    const { data } = await supabase.from(t).select("*");
    out[t] = data ?? [];
  }
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="academic-advisor-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
});
