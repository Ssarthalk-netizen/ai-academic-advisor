import "server-only";
import { completedGraded, overallCgpa, semesterStats, subjectStats } from "./analytics";
import { matchCareers } from "./careers";
import { sgpa } from "./grading";
import { subjectPriorities } from "./planner";
import { riskRadar } from "./radar";
import { buildRiskFeatures } from "./riskFeatures";
import type { AcademicRecord } from "./types";
import { predictRisk } from "../ml/risk";

/**
 * "Academic Command Center" — answers the blueprint's five questions:
 * Where am I? What's going wrong? What should I do? Am I improving? Where am I heading?
 */
export function computeInsights(rec: AcademicRecord) {
  const subs = subjectStats(rec);
  const sems = semesterStats(rec, subs);
  const finished = completedGraded(rec, subs);
  const currentNos = new Set(rec.semesters.filter((s) => s.is_current).map((s) => s.number));
  const current = subs.filter((s) => currentNos.has(s.semester));

  const rf = buildRiskFeatures(rec);
  const risk = rf.features ? { ...predictRisk(rf.features), assumptions: rf.assumptions, features: rf.features } : null;
  const alerts = riskRadar(rec);
  const priorities = subjectPriorities(rec);

  // Three prioritised actions: critical alerts first, then top planner subject
  const actions = [
    ...alerts.filter((a) => a.severity === "critical").map((a) => ({ title: a.action, because: a.title, subject: a.subject })),
    ...alerts.filter((a) => a.severity === "warning").map((a) => ({ title: a.action, because: a.title, subject: a.subject })),
    ...priorities.slice(0, 1).map((p) => ({ title: `Study ${p.subject} today`, because: p.reasons.join("; ") || "highest priority subject", subject: p.subject })),
  ].slice(0, 3);

  const finishedSems = sems.filter((s) => !s.isCurrent && s.sgpa !== null);
  const lastTwo = finishedSems.slice(-2);
  const now = Date.now();
  return {
    where: {
      cgpa: sgpa(finished),
      projectedCgpa: overallCgpa(rec, subs),
      currentSemester: rec.profile.current_semester,
      semesters: sems,
      creditsEarned: finished.reduce((s, x) => s + x.credits, 0),
      avgAttendance: current.length
        ? Math.round(current.filter((s) => s.attendance !== null).reduce((s, x) => s + (x.attendance ?? 0), 0) / Math.max(1, current.filter((s) => s.attendance !== null).length))
        : null,
    },
    wrong: { alerts, risk },
    todo: { actions, priorities: priorities.slice(0, 5) },
    improving: {
      sgpaTrend: lastTwo.length === 2 ? Math.round(((lastTwo[1].sgpa ?? 0) - (lastTwo[0].sgpa ?? 0)) * 100) / 100 : null,
      subjectTrends: current.filter((s) => s.trend !== null).map((s) => ({ subject: s.name, trend: s.trend })),
    },
    heading: {
      targetCgpa: rec.profile.target_cgpa,
      careerGoal: rec.profile.career_goal,
      careers: matchCareers(rec.profile.interests, rec.subjects.map((s) => s.name), rec.profile.career_goal).slice(0, 3),
    },
    currentSubjects: current,
    upcoming: {
      assignments: rec.assignments.filter((a) => a.status !== "submitted" && new Date(a.due_at).getTime() > now - 7 * 864e5).slice(0, 8),
      exams: rec.exams.filter((e) => new Date(e.exam_date).getTime() >= now - 864e5).slice(0, 6),
    },
    today: rec.sessions.filter((s) => s.planned_date === new Date().toISOString().slice(0, 10)),
  };
}

/** Compact, privacy-minimised summary sent to Gemini as context (no name, email, DOB). */
export function aiContext(rec: AcademicRecord) {
  const ins = computeInsights(rec);
  return {
    degree: rec.profile.degree, branch: rec.profile.branch, semester: rec.profile.current_semester,
    cgpa_finished: ins.where.cgpa, target_cgpa: rec.profile.target_cgpa, career_goal: rec.profile.career_goal,
    interests: rec.profile.interests, learning_style: rec.profile.learning_style, weekly_study_hours: rec.profile.weekly_study_hours,
    attendance_rule: `${rec.profile.attendance_threshold}%`,
    semesters: ins.where.semesters.map((s) => ({ sem: s.number, sgpa: s.sgpa, passed: `${s.passed}/${s.subjects}`, current: s.isCurrent })),
    current_subjects: ins.currentSubjects.map((s) => ({ name: s.name, percent: s.percent, source: s.percentSource, grade: s.grade, attendance: s.attendance, trend: s.trend, weak_topics: s.weakTopics, difficulty: s.difficulty })),
    ml_risk: ins.wrong.risk ? { level: ins.wrong.risk.level, probability: Math.round(ins.wrong.risk.probability * 100) / 100, top_factors: ins.wrong.risk.factors.map((f) => `${f.label}: ${Math.round(f.value * 100) / 100} (typical ${Math.round(f.typical * 100) / 100})`) } : null,
    alerts: ins.wrong.alerts.slice(0, 8).map((a) => `${a.severity}: ${a.title}. ${a.evidence}`),
    upcoming_exams: ins.upcoming.exams.map((e) => ({ title: e.title, date: e.exam_date, syllabus_done: e.syllabus_done })),
    pending_assignments: ins.upcoming.assignments.map((a) => ({ title: a.title, due: a.due_at.slice(0, 10), status: a.status })),
    skills: rec.skills.map((s) => `${s.name} (${s.level}/5)`),
    today: new Date().toISOString().slice(0, 10),
  };
}
