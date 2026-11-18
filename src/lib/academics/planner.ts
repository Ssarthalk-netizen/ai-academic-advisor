import { subjectStats } from "./analytics";
import type { AcademicRecord, StudySession } from "./types";

/**
 * Adaptive Study Scheduler (deterministic).
 *
 * 1. Score each current subject: weakness (low marks), self-rated difficulty,
 *    exam urgency, weak topics, pending assignments.
 * 2. Split the student's available minutes across the next N days in
 *    proportion to those scores, in 30–90 minute sessions, at most 3 a day,
 *    never the same subject twice in a row.
 * 3. The day before an exam is reserved for revising that subject.
 * 4. Missed sessions are spread over days that still have free capacity
 *    (not dumped onto tomorrow). Anything that doesn't fit is reported as
 *    overflow so the UI can say the plan is unrealistic.
 */

export type PlannedSession = {
  subject_id: string;
  subject: string;
  topic: string | null;
  planned_date: string; // YYYY-MM-DD
  planned_minutes: number;
  reason: string;
};

export type SubjectPriority = { subject_id: string; subject: string; score: number; reasons: string[] };

const DAY = 864e5;
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

export function subjectPriorities(rec: AcademicRecord, today = new Date()): SubjectPriority[] {
  const current = new Set(rec.semesters.filter((s) => s.is_current).map((s) => s.number));
  const stats = subjectStats(rec).filter((s) => current.has(s.semester));
  return stats
    .map((s) => {
      const reasons: string[] = [];
      let score = 1;
      if (s.percent !== null) {
        const weak = Math.max(0, 75 - s.percent) / 75; // 0 (≥75%) … 1 (0%)
        score += 3 * weak;
        if (s.percent < 50) reasons.push(`marks ${s.percent}%`);
      } else {
        score += 1;
      }
      if (s.difficulty) {
        score += (s.difficulty - 1) * 0.4;
        if (s.difficulty >= 4) reasons.push("rated difficult");
      }
      const exam = rec.exams
        .filter((e) => e.subject_id === s.id && new Date(e.exam_date).getTime() >= today.getTime() - DAY)
        .sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0];
      if (exam) {
        const d = Math.max(1, Math.ceil((new Date(exam.exam_date).getTime() - today.getTime()) / DAY));
        const urgency = d <= 30 ? (30 - d) / 30 : 0;
        score += 3 * urgency * (1 - exam.syllabus_done / 100);
        if (d <= 14) reasons.push(`exam in ${d} day(s)`);
      }
      if (s.weakTopics.length) {
        score += 0.5;
        reasons.push(`weak topics: ${s.weakTopics.slice(0, 2).join(", ")}`);
      }
      const pending = rec.assignments.filter((a) => a.subject_id === s.id && (a.status === "pending" || a.status === "in_progress"));
      if (pending.length) {
        score += 0.5 * pending.length;
        reasons.push(`${pending.length} pending assignment(s)`);
      }
      return { subject_id: s.id, subject: s.name, score: Math.round(score * 100) / 100, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

export function generatePlan(
  rec: AcademicRecord,
  opts: { days?: number; minutesPerDay?: number; start?: Date } = {},
): { sessions: PlannedSession[]; priorities: SubjectPriority[]; minutesPerDay: number } {
  const days = opts.days ?? 7;
  const start = opts.start ?? new Date();
  const minutesPerDay = Math.min(
    480,
    Math.max(30, opts.minutesPerDay ?? Math.round(((rec.profile.weekly_study_hours ?? 14) * 60) / 7)),
  );
  const pri = subjectPriorities(rec, start);
  if (!pri.length) return { sessions: [], priorities: pri, minutesPerDay };

  const weakTopic = new Map(subjectStats(rec).map((s) => [s.id, s.weakTopics]));
  const total = pri.reduce((s, p) => s + p.score, 0);
  const remaining = new Map(pri.map((p) => [p.subject_id, Math.round(((p.score / total) * minutesPerDay * days) / 15) * 15]));
  const name = new Map(pri.map((p) => [p.subject_id, p.subject]));
  const sessions: PlannedSession[] = [];

  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const dateStr = ymd(date);
    let capacity = minutesPerDay;
    let last: string | null = null;
    let count = 0;

    // exam tomorrow -> revision first
    for (const e of rec.exams) {
      if (e.subject_id && e.exam_date === ymd(addDays(date, 1)) && name.has(e.subject_id) && capacity >= 30) {
        const m = Math.min(90, capacity);
        sessions.push({ subject_id: e.subject_id, subject: name.get(e.subject_id)!, topic: "Full revision + past paper",
          planned_date: dateStr, planned_minutes: m, reason: `${e.title} is tomorrow` });
        capacity -= m; last = e.subject_id; count++;
        remaining.set(e.subject_id, Math.max(0, (remaining.get(e.subject_id) ?? 0) - m));
      }
    }

    while (capacity >= 30 && count < 3) {
      const next = [...remaining.entries()]
        .filter(([id, m]) => m >= 15 && id !== last)
        .sort((a, b) => b[1] - a[1])[0];
      if (!next) break;
      const [id, left] = next;
      const m = Math.floor(Math.min(90, capacity, Math.max(30, left)) / 5) * 5;
      const topics = weakTopic.get(id) ?? [];
      const p = pri.find((x) => x.subject_id === id)!;
      sessions.push({ subject_id: id, subject: name.get(id)!, topic: topics.length ? topics[count % topics.length] : null,
        planned_date: dateStr, planned_minutes: m, reason: p.reasons.join("; ") || "regular practice" });
      remaining.set(id, Math.max(0, left - m));
      capacity -= m; last = id; count++;
    }
  }
  return { sessions, priorities: pri, minutesPerDay };
}

/**
 * Re-plan missed sessions: spread their minutes over the next `horizon` days
 * that still have spare capacity, at most one recovery session per subject per day.
 */
export function rescheduleMissed(
  missed: StudySession[],
  upcoming: StudySession[],
  opts: { minutesPerDay: number; horizon?: number; start?: Date; subjectNames: Map<string, string> },
) {
  const horizon = opts.horizon ?? 5;
  const start = opts.start ?? addDays(new Date(), 1);
  const load = new Map<string, number>();
  const taken = new Set<string>();
  for (const s of upcoming) {
    load.set(s.planned_date, (load.get(s.planned_date) ?? 0) + s.planned_minutes);
    if (s.subject_id) taken.add(`${s.planned_date}|${s.subject_id}`);
  }
  const placed: (PlannedSession & { rescheduled_from: string })[] = [];
  let overflow = 0;

  for (const m of missed) {
    let left = m.planned_minutes;
    for (let i = 0; i < horizon && left >= 15; i++) {
      const d = ymd(addDays(start, i));
      const free = opts.minutesPerDay - (load.get(d) ?? 0);
      const key = `${d}|${m.subject_id}`;
      if (free < 20 || taken.has(key)) continue;
      const chunk = Math.floor(Math.min(left, free, 60) / 5) * 5;
      placed.push({
        subject_id: m.subject_id ?? "", subject: opts.subjectNames.get(m.subject_id ?? "") ?? "Study",
        topic: m.topic, planned_date: d, planned_minutes: chunk, reason: "Recovered from a missed session",
        rescheduled_from: m.id,
      });
      load.set(d, (load.get(d) ?? 0) + chunk);
      taken.add(key);
      left -= chunk;
    }
    overflow += left;
  }
  return { placed, overflowMinutes: overflow };
}
