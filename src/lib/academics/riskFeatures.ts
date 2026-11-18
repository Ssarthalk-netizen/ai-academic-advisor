import { semesterStats, subjectStats } from "./analytics";
import type { AcademicRecord } from "./types";

/**
 * Maps a student's own records onto the 15 features the Random Forest was
 * trained on. "Previous" and "latest" are the two most recent semesters that
 * have any marks. Anything the student hasn't entered is filled with the
 * training-data median and reported back as an assumption, so the UI can say
 * so instead of hiding it.
 */

const DATASET_MEDIAN = { admission_grade: 63.5, age_at_enrollment: 20 };

export function buildRiskFeatures(rec: AcademicRecord) {
  const assumptions: string[] = [];
  const sems = semesterStats(rec, subjectStats(rec)).filter((s) => s.graded > 0);

  if (sems.length === 0) {
    return { features: null, assumptions: ["No marks entered yet. Add at least one semester's results or assessments."] };
  }
  const latest = sems[sems.length - 1];
  const previous = sems.length > 1 ? sems[sems.length - 2] : latest;
  if (sems.length === 1) assumptions.push("Only one semester has marks, so it is used for both semesters (trend = 0).");
  if (latest.provisional) assumptions.push(`Semester ${latest.number} uses assessment averages because final marks aren't in yet.`);

  const p = rec.profile;
  let admission = p.admission_score;
  if (admission === null || admission === undefined) {
    admission = DATASET_MEDIAN.admission_grade;
    assumptions.push("Admission score not provided, so the dataset median (63.5%) is used.");
  }

  let age = DATASET_MEDIAN.age_at_enrollment;
  if (p.date_of_birth) {
    const dob = new Date(p.date_of_birth);
    const yearsStudied = Math.max(0, ((p.current_semester ?? 1) - 1) / 2);
    age = Math.round((Date.now() - dob.getTime()) / (365.25 * 864e5) - yearsStudied);
  } else {
    assumptions.push("Date of birth not provided, so age at enrolment is assumed to be 20.");
  }

  const rate = (passed: number, enrolled: number) => (enrolled > 0 ? passed / enrolled : 0);
  const features = {
    admission_grade: Number(admission),
    age_at_enrollment: age,
    scholarship_holder: p.scholarship_holder ? 1 : 0,
    debtor: p.has_outstanding_dues ? 1 : 0,
    tuition_up_to_date: p.fees_up_to_date ? 1 : 0,
    displaced: p.living_away_from_home ? 1 : 0,
    sem1_enrolled: previous.subjects,
    sem1_approved: previous.passed,
    sem1_grade: previous.passedMeanPoints,
    sem2_enrolled: latest.subjects,
    sem2_approved: latest.passed,
    sem2_grade: latest.passedMeanPoints,
    sem1_pass_rate: rate(previous.passed, previous.subjects),
    sem2_pass_rate: rate(latest.passed, latest.subjects),
    grade_trend: latest.passedMeanPoints - previous.passedMeanPoints,
  };
  return { features, assumptions, semestersUsed: { previous: previous.number, latest: latest.number } };
}
