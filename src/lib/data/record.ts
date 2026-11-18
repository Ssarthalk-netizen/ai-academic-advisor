import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AcademicRecord } from "../academics/types";
import { ApiError } from "../security/errors";

/** Loads everything for the signed-in user. RLS guarantees only their rows come back. */
export async function loadRecord(supabase: SupabaseClient, userId: string): Promise<AcademicRecord> {
  const since = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
  const [profile, semesters, subjects, assessments, assignments, exams, sessions, skills] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("semesters").select("id,number,label,is_current").order("number"),
    supabase.from("subjects").select("id,semester_id,name,code,credits,marks_obtained,max_marks,classes_attended,classes_total,difficulty").order("created_at"),
    supabase.from("assessments").select("id,subject_id,kind,title,topic,score,max_score,taken_on").order("taken_on"),
    supabase.from("assignments").select("id,subject_id,title,description,due_at,status,est_hours").order("due_at"),
    supabase.from("exams").select("id,subject_id,title,kind,exam_date,syllabus_done").order("exam_date"),
    supabase.from("study_sessions").select("id,subject_id,topic,planned_date,planned_minutes,actual_minutes,status,understanding,source").gte("planned_date", since).order("planned_date"),
    supabase.from("skills").select("id,name,level,evidence").order("name"),
  ]);
  const failed = [profile, semesters, subjects, assessments, assignments, exams, sessions, skills].find((r) => r.error);
  if (failed?.error) {
    console.error("[loadRecord]", failed.error.message);
    throw new ApiError(500, "Could not load your records.");
  }
  const num = <T extends Record<string, unknown>>(rows: T[], keys: (keyof T)[]) =>
    rows.map((r) => {
      const o = { ...r };
      for (const k of keys) if (o[k] !== null && o[k] !== undefined) (o[k] as unknown) = Number(o[k]);
      return o;
    });
  return {
    profile: { ...profile.data, admission_score: profile.data.admission_score === null ? null : Number(profile.data.admission_score), target_cgpa: profile.data.target_cgpa === null ? null : Number(profile.data.target_cgpa) },
    semesters: semesters.data ?? [],
    subjects: num(subjects.data ?? [], ["credits", "marks_obtained", "max_marks"]),
    assessments: num(assessments.data ?? [], ["score", "max_score"]),
    assignments: num(assignments.data ?? [], ["est_hours"]),
    exams: exams.data ?? [],
    sessions: sessions.data ?? [],
    skills: skills.data ?? [],
  } as AcademicRecord;
}
