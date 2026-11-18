import { NextResponse } from "next/server";
import { requireUser } from "@/lib/data/auth";
import { loadRecord } from "@/lib/data/record";
import { rescheduleMissed } from "@/lib/academics/planner";
import { route } from "@/lib/security/errors";
import { rateLimit } from "@/lib/security/rateLimit";

/**
 * Dynamic rescheduling: past sessions still "planned" become "missed", and every
 * missed session from the last 7 days that hasn't been recovered yet is spread
 * across the next days with free capacity.
 */
export const POST = route(async () => {
  const { supabase, user } = await requireUser();
  await rateLimit("WRITE", user.id);
  const today = new Date().toISOString().slice(0, 10);
  await supabase.from("study_sessions").update({ status: "missed" }).eq("user_id", user.id).eq("status", "planned").lt("planned_date", today);

  const rec = await loadRecord(supabase, user.id);
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const { data: recovered } = await supabase.from("study_sessions").select("rescheduled_from").not("rescheduled_from", "is", null);
  const done = new Set((recovered ?? []).map((r) => r.rescheduled_from));
  const missed = rec.sessions.filter((s) => s.status === "missed" && s.planned_date >= weekAgo && !done.has(s.id));
  const upcoming = rec.sessions.filter((s) => s.status === "planned" && s.planned_date > today);
  const minutesPerDay = Math.round(((rec.profile.weekly_study_hours ?? 14) * 60) / 7);

  const { placed, overflowMinutes } = rescheduleMissed(missed, upcoming, {
    minutesPerDay, subjectNames: new Map(rec.subjects.map((s) => [s.id, s.name])),
  });
  if (placed.length) {
    const { error } = await supabase.from("study_sessions").insert(placed.map((p) => ({
      subject_id: p.subject_id || null, topic: p.topic, planned_date: p.planned_date, planned_minutes: p.planned_minutes,
      source: "recovery", rescheduled_from: p.rescheduled_from,
    })));
    if (error) throw error;
  }
  return NextResponse.json({
    missed: missed.length, placed, overflowMinutes,
    message: overflowMinutes > 0
      ? `${Math.round(overflowMinutes / 60)} h couldn't fit in the next 5 days without overloading you. Lower your plan or drop low-priority topics.`
      : placed.length ? `Moved ${placed.length} recovery session(s) into days with free time.` : "Nothing to reschedule. Nice work!",
  });
});
