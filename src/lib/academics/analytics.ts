import { attendancePercent, gradeFor, PASS_PERCENT, round2, sgpa, type GradedSubject } from "./grading";
import type { AcademicRecord, Assessment, Subject } from "./types";

/**
 * Turns raw records into per-subject and per-semester numbers used everywhere
 * (dashboard, risk features, radar, planner, AI context).
 */

export type SubjectStats = {
  id: string;
  name: string;
  semester: number;
  credits: number;
  percent: number | null;          // final marks, else assessment average
  percentSource: "final" | "assessments" | "none";
  grade: string | null;
  points: number | null;
  attendance: number | null;
  assessments: number;
  trend: number | null;            // recent assessment % minus earlier %
  weakTopics: string[];
  difficulty: number | null;
};

function assessmentPercent(list: Assessment[]): number | null {
  const score = list.reduce((s, a) => s + a.score, 0);
  const max = list.reduce((s, a) => s + a.max_score, 0);
  return max > 0 ? round2((score / max) * 100) : null;
}

export function subjectStats(rec: AcademicRecord): SubjectStats[] {
  const semNo = new Map(rec.semesters.map((s) => [s.id, s.number]));
  return rec.subjects.map((sub: Subject) => {
    const as = rec.assessments
      .filter((a) => a.subject_id === sub.id)
      .sort((a, b) => (a.taken_on ?? "").localeCompare(b.taken_on ?? ""));
    const final = sub.marks_obtained !== null ? round2((sub.marks_obtained / sub.max_marks) * 100) : null;
    const avg = assessmentPercent(as);
    const percent = final ?? avg;

    let trend: number | null = null;
    if (as.length >= 3) {
      const k = Math.max(1, Math.floor(as.length / 2));
      // mean of percentages, so a 40-mark mid-term doesn't outweigh a 10-mark quiz
      const pct = (l: Assessment[]) => l.reduce((s, a) => s + (a.score / a.max_score) * 100, 0) / l.length;
      trend = round2(pct(as.slice(-k)) - pct(as.slice(0, as.length - k)));
    }

    const byTopic = new Map<string, number[]>();
    for (const a of as) {
      if (!a.topic) continue;
      const k = a.topic.trim().toLowerCase();
      byTopic.set(k, [...(byTopic.get(k) ?? []), (a.score / a.max_score) * 100]);
    }
    const weakTopics = [...byTopic.entries()]
      .filter(([, ps]) => ps.reduce((s, p) => s + p, 0) / ps.length < 50)
      .map(([t]) => t);

    const g = percent !== null ? gradeFor(percent) : null;
    return {
      id: sub.id,
      name: sub.name,
      semester: semNo.get(sub.semester_id) ?? 0,
      credits: Number(sub.credits),
      percent,
      percentSource: final !== null ? "final" : avg !== null ? "assessments" : "none",
      grade: g?.grade ?? null,
      points: g?.points ?? null,
      attendance: attendancePercent(sub.classes_attended, sub.classes_total),
      assessments: as.length,
      trend,
      weakTopics,
      difficulty: sub.difficulty,
    };
  });
}

export type SemesterStats = {
  number: number;
  isCurrent: boolean;
  subjects: number;
  graded: number;
  passed: number;
  credits: number;
  sgpa: number | null;
  passedMeanPoints: number;   // mean grade point of passed subjects (matches training data's "grade")
  provisional: boolean;       // true if any mark comes from assessments, not finals
};

export function semesterStats(rec: AcademicRecord, stats = subjectStats(rec)): SemesterStats[] {
  return [...rec.semesters]
    .sort((a, b) => a.number - b.number)
    .map((sem) => {
      const subs = stats.filter((s) => s.semester === sem.number);
      const graded = subs.filter((s) => s.percent !== null) as (SubjectStats & { percent: number })[];
      const passed = graded.filter((s) => s.percent >= PASS_PERCENT);
      return {
        number: sem.number,
        isCurrent: sem.is_current,
        subjects: subs.length,
        graded: graded.length,
        passed: passed.length,
        credits: subs.reduce((s, x) => s + x.credits, 0),
        sgpa: sgpa(graded.map((s) => ({ credits: s.credits, percent: s.percent }))),
        passedMeanPoints: passed.length ? round2(passed.reduce((s, x) => s + (x.points ?? 0), 0) / passed.length) : 0,
        provisional: graded.some((s) => s.percentSource === "assessments"),
      };
    });
}

/** Finished-semester subjects as GradedSubject list (finals only), for CGPA maths. */
export function completedGraded(rec: AcademicRecord, stats = subjectStats(rec)): GradedSubject[] {
  const current = new Set(rec.semesters.filter((s) => s.is_current).map((s) => s.number));
  return stats
    .filter((s) => !current.has(s.semester) && s.percentSource === "final" && s.percent !== null)
    .map((s) => ({ credits: s.credits, percent: s.percent as number }));
}

export function overallCgpa(rec: AcademicRecord, stats = subjectStats(rec)) {
  const graded = stats.filter((s) => s.percent !== null).map((s) => ({ credits: s.credits, percent: s.percent as number }));
  return sgpa(graded);
}
