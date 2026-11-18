// Response shapes of the API (kept loose on purpose; the server is the source of truth).
export type Alert = { id: string; severity: "critical" | "warning" | "info"; category: string; subject?: string; title: string; evidence: string; action: string };
export type SubjectStat = { id: string; name: string; semester: number; credits: number; percent: number | null; percentSource: string; grade: string | null; points: number | null; attendance: number | null; assessments: number; trend: number | null; weakTopics: string[]; difficulty: number | null };
export type SemStat = { number: number; isCurrent: boolean; subjects: number; graded: number; passed: number; credits: number; sgpa: number | null; provisional: boolean };
export type Risk = { probability: number; level: "Low" | "Medium" | "High"; model: string; factors: { feature: string; label: string; value: number; typical: number; weight: number }[]; assumptions: string[]; features: Record<string, number> };
export type Overview = {
  profile: { full_name: string | null; target_cgpa: number | null; career_goal: string | null; attendance_threshold: number; ai_consent: boolean; current_semester: number | null };
  empty: boolean;
  riskHistory: { probability: number; level: string; created_at: string }[];
  insights: {
    where: { cgpa: number | null; projectedCgpa: number | null; currentSemester: number | null; semesters: SemStat[]; creditsEarned: number; avgAttendance: number | null };
    wrong: { alerts: Alert[]; risk: Risk | null };
    todo: { actions: { title: string; because: string; subject?: string }[]; priorities: { subject_id: string; subject: string; score: number; reasons: string[] }[] };
    improving: { sgpaTrend: number | null; subjectTrends: { subject: string; trend: number }[] };
    heading: { targetCgpa: number | null; careerGoal: string | null; careers: { id: string; title: string; score: number }[] };
    currentSubjects: SubjectStat[];
    upcoming: { assignments: { id: string; title: string; due_at: string; status: string; subject_id: string | null }[]; exams: { id: string; title: string; exam_date: string; syllabus_done: number }[] };
    today: { id: string; subject_id: string | null; topic: string | null; planned_minutes: number; status: string }[];
  };
};

export const riskTone = (l?: string) => (l === "High" ? "alarm" : l === "Medium" ? "ember" : "leaf") as "alarm" | "ember" | "leaf";
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
export const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5);
