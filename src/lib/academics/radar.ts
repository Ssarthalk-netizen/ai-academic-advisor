import { classesCanMiss, classesToReach, PASS_PERCENT } from "./grading";
import { subjectStats } from "./analytics";
import type { AcademicRecord } from "./types";

/**
 * Academic Risk Radar — transparent, rule-based warnings that sit alongside
 * the ML risk score. Every warning carries the evidence behind it and one
 * concrete corrective action.
 */

export type Severity = "critical" | "warning" | "info";
export type RadarAlert = {
  id: string;
  severity: Severity;
  category: "attendance" | "marks" | "trend" | "topic" | "deadline" | "exam" | "workload";
  subject?: string;
  title: string;
  evidence: string;
  action: string;
};

const DAY = 864e5;
const days = (iso: string, now: number) => Math.ceil((new Date(iso).getTime() - now) / DAY);

export function riskRadar(rec: AcademicRecord, now = Date.now()): RadarAlert[] {
  const alerts: RadarAlert[] = [];
  const th = rec.profile.attendance_threshold ?? 75;
  const current = new Set(rec.semesters.filter((s) => s.is_current).map((s) => s.id));
  const currentSubjects = rec.subjects.filter((s) => current.has(s.semester_id));
  const stats = new Map(subjectStats(rec).map((s) => [s.id, s]));

  for (const sub of currentSubjects) {
    const st = stats.get(sub.id)!;
    // --- attendance
    if (st.attendance !== null) {
      if (st.attendance < th) {
        const need = classesToReach(sub.classes_attended, sub.classes_total, th);
        alerts.push({
          id: `att-${sub.id}`, severity: "critical", category: "attendance", subject: sub.name,
          title: `Attendance below ${th}% in ${sub.name}`,
          evidence: `${sub.classes_attended}/${sub.classes_total} classes attended (${st.attendance}%).`,
          action: `Attend the next ${need} classes in a row to get back to ${th}%.`,
        });
      } else if (st.attendance < th + 5) {
        const canMiss = classesCanMiss(sub.classes_attended, sub.classes_total, th);
        alerts.push({
          id: `att-${sub.id}`, severity: "warning", category: "attendance", subject: sub.name,
          title: `Attendance close to the ${th}% limit in ${sub.name}`,
          evidence: `${st.attendance}% now. You can miss only ${canMiss} more class${canMiss === 1 ? "" : "es"}.`,
          action: "Avoid skipping this subject until the margin improves.",
        });
      }
    }
    // --- marks
    if (st.percent !== null) {
      const src = st.percentSource === "final" ? "final marks" : `average of ${st.assessments} assessment(s)`;
      if (st.percent < PASS_PERCENT) {
        alerts.push({
          id: `marks-${sub.id}`, severity: "critical", category: "marks", subject: sub.name,
          title: `Currently failing ${sub.name}`,
          evidence: `${st.percent}% (${src}). Pass mark is ${PASS_PERCENT}%.`,
          action: "Meet the faculty this week, then follow a recovery plan from the Study Planner.",
        });
      } else if (st.percent < 50) {
        alerts.push({
          id: `marks-${sub.id}`, severity: "warning", category: "marks", subject: sub.name,
          title: `Marks just above passing in ${sub.name}`,
          evidence: `${st.percent}% (${src}).`,
          action: "Add two extra practice sessions per week for this subject.",
        });
      }
    }
    // --- trend
    if (st.trend !== null && st.trend <= -10) {
      alerts.push({
        id: `trend-${sub.id}`, severity: "warning", category: "trend", subject: sub.name,
        title: `Marks falling in ${sub.name}`,
        evidence: `Recent assessments are ${Math.abs(st.trend)} points lower than earlier ones.`,
        action: "Revisit the topics from the latest assessment before the next one.",
      });
    }
    // --- repeated weak topics
    if (st.weakTopics.length) {
      alerts.push({
        id: `topic-${sub.id}`, severity: "info", category: "topic", subject: sub.name,
        title: `Weak topics in ${sub.name}`,
        evidence: `Average below 50% in: ${st.weakTopics.join(", ")}.`,
        action: "Ask the AI Advisor to explain these topics differently, then re-test yourself.",
      });
    }
  }

  // --- deadlines
  const subjName = new Map(rec.subjects.map((s) => [s.id, s.name]));
  for (const a of rec.assignments) {
    if (a.status === "submitted") continue;
    const d = days(a.due_at, now);
    const subj = a.subject_id ? subjName.get(a.subject_id) : undefined;
    if (d < 0 && a.status !== "missed") {
      alerts.push({
        id: `asg-${a.id}`, severity: "critical", category: "deadline", subject: subj,
        title: `Overdue: ${a.title}`, evidence: `Was due ${Math.abs(d)} day(s) ago.`,
        action: "Ask the faculty whether late submission is still possible and submit today.",
      });
    } else if (d >= 0 && d <= 3) {
      alerts.push({
        id: `asg-${a.id}`, severity: "warning", category: "deadline", subject: subj,
        title: `Due soon: ${a.title}`,
        evidence: `Due in ${d} day(s)${a.est_hours ? `, about ${a.est_hours} h of work` : ""}. Status: ${a.status.replace("_", " ")}.`,
        action: "Block time for it in today's plan.",
      });
    }
  }

  // --- exams
  for (const e of rec.exams) {
    const d = days(e.exam_date, now);
    if (d < 0 || d > 21) continue;
    const subj = e.subject_id ? subjName.get(e.subject_id) : undefined;
    if (e.syllabus_done < 60) {
      alerts.push({
        id: `exam-${e.id}`, severity: d <= 7 ? "critical" : "warning", category: "exam", subject: subj,
        title: `${e.title} in ${d} day(s)`,
        evidence: `Only ${e.syllabus_done}% of the syllabus covered.`,
        action: `About ${Math.ceil((100 - e.syllabus_done) / Math.max(1, d))}% of the syllabus per day is needed. Generate an exam-mode plan.`,
      });
    }
  }

  // --- reality check: planned vs completed (last 7 days)
  const weekAgo = now - 7 * DAY;
  const lastWeek = rec.sessions.filter((s) => {
    const t = new Date(s.planned_date).getTime();
    return t >= weekAgo && t < now;
  });
  const planned = lastWeek.reduce((s, x) => s + x.planned_minutes, 0);
  const done = lastWeek.filter((s) => s.status === "done").reduce((s, x) => s + (x.actual_minutes ?? x.planned_minutes), 0);
  if (planned >= 120 && done / planned < 0.6) {
    alerts.push({
      id: "reality", severity: "warning", category: "workload",
      title: "Your plan is more than you're completing",
      evidence: `Planned ${Math.round(planned / 60)} h last week, completed ${Math.round(done / 60)} h (${Math.round((done / planned) * 100)}%).`,
      action: "Reduce daily planned time by about a third and prioritise the subjects flagged above.",
    });
  }

  const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}
