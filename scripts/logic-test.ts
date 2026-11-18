// Offline test of the academic logic using the sample data (no database needed).
// Run: node --conditions=react-server --import tsx scripts/logic-test.ts
import { DEMO_ASSESSMENTS, DEMO_ASSIGNMENTS, DEMO_EXAMS, DEMO_PROFILE, DEMO_SEMESTERS, DEMO_SESSIONS, DEMO_SKILLS, demoHelpers } from "../src/lib/academics/demo";
import type { AcademicRecord } from "../src/lib/academics/types";
import { semesterStats, subjectStats, overallCgpa, completedGraded } from "../src/lib/academics/analytics";
import { buildRiskFeatures } from "../src/lib/academics/riskFeatures";
import { predictRisk } from "../src/lib/ml/risk";
import { riskRadar } from "../src/lib/academics/radar";
import { generatePlan, rescheduleMissed } from "../src/lib/academics/planner";
import { requiredForTarget, whatIf, sgpa, classesToReach } from "../src/lib/academics/grading";
import { matchCareers, skillGap, CAREER_PATHS } from "../src/lib/academics/careers";
import assert from "node:assert";

const id = (p: string, i: number) => `${p}-${i}`;
const rec: AcademicRecord = {
  profile: { id: "u", date_of_birth: "2006-03-10", ai_consent: true, ...DEMO_PROFILE } as AcademicRecord["profile"],
  semesters: DEMO_SEMESTERS.map((s, i) => ({ id: id("sem", i), number: s.number, label: null, is_current: s.is_current })),
  subjects: DEMO_SEMESTERS.flatMap((s, i) => s.subjects.map((x) => ({
    id: x.code, semester_id: id("sem", i), name: x.name, code: x.code, credits: x.credits,
    marks_obtained: x.marks ?? null, max_marks: 100, classes_attended: x.att[0], classes_total: x.att[1], difficulty: x.diff ?? null }))),
  assessments: DEMO_ASSESSMENTS.map((a, i) => ({ id: id("as", i), subject_id: a[0], kind: a[1], title: a[2], topic: a[3], score: a[4], max_score: a[5], taken_on: demoHelpers.date(-a[6]) })),
  assignments: DEMO_ASSIGNMENTS.map((a, i) => ({ id: id("asg", i), subject_id: a[0], title: a[1], description: null, due_at: demoHelpers.iso(a[2]), status: a[3] as "pending", est_hours: a[4] })),
  exams: DEMO_EXAMS.map((e, i) => ({ id: id("ex", i), subject_id: e[0], title: e[1], kind: e[2], exam_date: demoHelpers.date(e[3]), syllabus_done: e[4] })),
  sessions: DEMO_SESSIONS.map((s, i) => ({ id: id("ss", i), subject_id: s[0], topic: null, planned_date: demoHelpers.date(-s[1]), planned_minutes: s[4], actual_minutes: s[3], status: s[2] as "done", understanding: null, source: "planner" })),
  skills: DEMO_SKILLS.map((s, i) => ({ id: id("sk", i), name: s[0], level: s[1], evidence: s[2] })),
};

console.log("== Semesters"); console.table(semesterStats(rec));
console.log("== Current subjects"); console.table(subjectStats(rec).filter((s) => s.semester === 3).map(({ name, percent, grade, attendance, trend, weakTopics }) => ({ name, percent, grade, attendance, trend, weak: weakTopics.join("|") })));
console.log("CGPA incl. provisional:", overallCgpa(rec), " finished-only:", sgpa(completedGraded(rec)));

const f = buildRiskFeatures(rec);
console.log("== Risk features", f.features, f.assumptions);
const r = predictRisk(f.features!);
console.log("risk", r.probability.toFixed(3), r.level, r.factors.map((x) => `${x.label}: ${x.value} vs ${x.typical}`));

// a struggling student
const bad = { ...f.features!, sem2_approved: 2, sem2_pass_rate: 0.4, sem2_grade: 5.5, grade_trend: -1.5, tuition_up_to_date: 0, debtor: 1 };
const rb = predictRisk(bad);
console.log("struggling student risk", rb.probability.toFixed(3), rb.level);
assert(rb.probability > r.probability, "struggling student should be riskier");

console.log("== Radar"); for (const a of riskRadar(rec)) console.log(`[${a.severity}] ${a.title} | ${a.evidence} | ${a.action}`);

const plan = generatePlan(rec, { days: 7 });
console.log("== Plan", plan.minutesPerDay, "min/day"); console.table(plan.priorities);
console.table(plan.sessions.map((s) => ({ d: s.planned_date, s: s.subject, m: s.planned_minutes, topic: s.topic })));
const perDay = new Map<string, number>(); for (const s of plan.sessions) perDay.set(s.planned_date, (perDay.get(s.planned_date) ?? 0) + s.planned_minutes);
assert([...perDay.values()].every((m) => m <= plan.minutesPerDay), "daily cap respected");

const missed = rec.sessions.filter((s) => s.status === "missed");
const resched = rescheduleMissed(missed, [], { minutesPerDay: plan.minutesPerDay, subjectNames: new Map(rec.subjects.map((s) => [s.id, s.name])) });
console.log("rescheduled", resched.placed.map((p) => `${p.planned_date} ${p.subject} ${p.planned_minutes}`), "overflow", resched.overflowMinutes);

const done = completedGraded(rec);
console.log("== Target 8.5 with 17 credits left:", requiredForTarget(done, 17, 8.5));
console.log("== Target 8.0 this sem:", requiredForTarget(done, 17, 8));
console.log("== Target 8.0 by graduation (6 sems x 17):", requiredForTarget(done, 102, 8));
console.log("== What-if all 75%:", whatIf(done, [4, 4, 3, 3, 3].map((c) => ({ credits: c, percent: 75 }))).projectedCgpa);
assert.equal(classesToReach(24, 34, 75), 6);
assert.equal(sgpa([{ credits: 4, percent: 95 }, { credits: 2, percent: 45 }]), 8);

const m = matchCareers(rec.profile.interests, rec.subjects.map((s) => s.name), rec.profile.career_goal);
console.log("== Careers", m.slice(0, 3));
console.table(skillGap(CAREER_PATHS[0], rec.skills));
console.log("ALL LOGIC TESTS PASSED");
