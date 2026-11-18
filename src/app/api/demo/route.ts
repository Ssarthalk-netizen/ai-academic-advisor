import { NextResponse } from "next/server";
import { requireUser } from "@/lib/data/auth";
import { DEMO_ASSESSMENTS, DEMO_ASSIGNMENTS, DEMO_EXAMS, DEMO_PROFILE, DEMO_SEMESTERS, DEMO_SESSIONS, DEMO_SKILLS, demoHelpers } from "@/lib/academics/demo";
import { ApiError, route } from "@/lib/security/errors";
import { rateLimit } from "@/lib/security/rateLimit";

const RECORD_TABLES = ["study_sessions", "assessments", "assignments", "exams", "subjects", "semesters", "skills", "goals", "risk_snapshots", "chat_messages", "ai_recommendations"];

async function wipe(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], userId: string) {
  for (const t of RECORD_TABLES) {
    const { error } = await supabase.from(t).delete().eq("user_id", userId);
    if (error) throw error;
  }
}

/** Load clearly-labelled SAMPLE data (replaces the user's existing records). */
export const POST = route(async () => {
  const { supabase, user } = await requireUser();
  await rateLimit("WRITE", user.id);
  await wipe(supabase, user.id);

  const { error: pe } = await supabase.from("profiles").update(DEMO_PROFILE).eq("id", user.id);
  if (pe) throw pe;

  const codeToId = new Map<string, string>();
  for (const sem of DEMO_SEMESTERS) {
    const { data: s, error } = await supabase.from("semesters").insert({ number: sem.number, is_current: sem.is_current, label: `Semester ${sem.number}` }).select("id").single();
    if (error || !s) throw error ?? new ApiError(500, "Could not create semester.");
    const { data: subs, error: se } = await supabase.from("subjects").insert(sem.subjects.map((x) => ({
      semester_id: s.id, name: x.name, code: x.code, credits: x.credits, marks_obtained: x.marks ?? null, max_marks: 100,
      classes_attended: x.att[0], classes_total: x.att[1], difficulty: x.diff ?? null,
    }))).select("id,code");
    if (se) throw se;
    subs?.forEach((r) => codeToId.set(r.code, r.id));
  }
  const sid = (code: string | null) => (code ? codeToId.get(code) ?? null : null);
  const inserts = await Promise.all([
    supabase.from("assessments").insert(DEMO_ASSESSMENTS.map((a) => ({ subject_id: sid(a[0]), kind: a[1], title: a[2], topic: a[3], score: a[4], max_score: a[5], taken_on: demoHelpers.date(-a[6]) }))),
    supabase.from("assignments").insert(DEMO_ASSIGNMENTS.map((a) => ({ subject_id: sid(a[0]), title: a[1], due_at: demoHelpers.iso(a[2]), status: a[3], est_hours: a[4] }))),
    supabase.from("exams").insert(DEMO_EXAMS.map((e) => ({ subject_id: sid(e[0]), title: e[1], kind: e[2], exam_date: demoHelpers.date(e[3]), syllabus_done: e[4] }))),
    supabase.from("skills").insert(DEMO_SKILLS.map((s) => ({ name: s[0], level: s[1], evidence: s[2] }))),
    supabase.from("study_sessions").insert(DEMO_SESSIONS.map((s) => ({ subject_id: sid(s[0]), planned_date: demoHelpers.date(-s[1]), status: s[2], actual_minutes: s[3], planned_minutes: s[4], source: "manual" }))),
    supabase.from("goals").insert([{ title: "Reach 8.0 CGPA by end of Semester 3", kind: "academic" }, { title: "Build and deploy an ML project", kind: "skill" }]),
  ]);
  const bad = inserts.find((r) => r.error);
  if (bad?.error) throw bad.error;
  return NextResponse.json({ ok: true });
});

/** Clear all academic records (keeps the account). */
export const DELETE = route(async () => {
  const { supabase, user } = await requireUser();
  await rateLimit("WRITE", user.id);
  await wipe(supabase, user.id);
  return NextResponse.json({ ok: true });
});
