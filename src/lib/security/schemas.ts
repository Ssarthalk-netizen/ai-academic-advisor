import { z } from "zod";

/**
 * Strict input schemas: unknown keys are rejected (z.strictObject), every
 * string has a length cap and every number a range. Mirrors the DB checks.
 */
const text = (max: number) => z.string().trim().min(1).max(max);
const optText = (max: number) => z.string().trim().max(max).nullable().optional();
const uuid = z.uuid();
const isoDate = z.iso.date();

export const profileSchema = z.strictObject({
  full_name: optText(100),
  university: optText(150),
  degree: optText(100),
  branch: optText(100),
  current_semester: z.int().min(1).max(12).nullable().optional(),
  admission_score: z.number().min(0).max(100).nullable().optional(),
  date_of_birth: isoDate.nullable().optional(),
  scholarship_holder: z.boolean().optional(),
  fees_up_to_date: z.boolean().optional(),
  has_outstanding_dues: z.boolean().optional(),
  living_away_from_home: z.boolean().optional(),
  interests: z.array(text(40)).max(15).optional(),
  learning_style: z.enum(["visual", "reading", "practice", "video", "mixed"]).nullable().optional(),
  weekly_study_hours: z.int().min(0).max(100).nullable().optional(),
  attendance_threshold: z.int().min(0).max(100).optional(),
  target_cgpa: z.number().min(0).max(10).nullable().optional(),
  career_goal: optText(100),
  onboarded: z.boolean().optional(),
  ai_consent: z.boolean().optional(),
});

const semester = z.strictObject({
  number: z.int().min(1).max(12),
  label: optText(50),
  is_current: z.boolean().optional(),
});
const subject = z.strictObject({
  semester_id: uuid,
  name: text(120),
  code: optText(30),
  credits: z.number().min(0).max(20),
  marks_obtained: z.number().min(0).max(1000).nullable().optional(),
  max_marks: z.number().positive().max(1000).optional(),
  classes_attended: z.int().min(0).max(1000).optional(),
  classes_total: z.int().min(0).max(1000).optional(),
  difficulty: z.int().min(1).max(5).nullable().optional(),
});
const assessment = z.strictObject({
  subject_id: uuid,
  kind: z.enum(["quiz", "assignment", "midterm", "practical", "endterm", "other"]),
  title: optText(120),
  topic: optText(120),
  score: z.number().min(0).max(1000),
  max_score: z.number().positive().max(1000),
  taken_on: isoDate.nullable().optional(),
});
const assignment = z.strictObject({
  subject_id: uuid.nullable().optional(),
  title: text(150),
  description: optText(1000),
  due_at: z.iso.datetime({ offset: true }),
  status: z.enum(["pending", "in_progress", "submitted", "missed"]).optional(),
  est_hours: z.number().min(0).max(100).nullable().optional(),
});
const exam = z.strictObject({
  subject_id: uuid.nullable().optional(),
  title: text(150),
  kind: z.enum(["midterm", "endterm", "practical", "quiz", "other"]).optional(),
  exam_date: isoDate,
  syllabus_done: z.int().min(0).max(100).optional(),
});
const session = z.strictObject({
  subject_id: uuid.nullable().optional(),
  topic: optText(150),
  planned_date: isoDate,
  planned_minutes: z.int().min(10).max(600),
  actual_minutes: z.int().min(0).max(900).nullable().optional(),
  status: z.enum(["planned", "done", "missed", "skipped"]).optional(),
  understanding: z.int().min(1).max(5).nullable().optional(),
});
const goal = z.strictObject({
  title: text(150),
  kind: z.enum(["academic", "skill", "career"]).optional(),
  target_date: isoDate.nullable().optional(),
  done: z.boolean().optional(),
});
const skill = z.strictObject({
  name: text(80),
  level: z.int().min(1).max(5),
  evidence: optText(300),
});

/** Tables editable through /api/records/[table]. Anything else is rejected. */
export const RECORD_SCHEMAS = {
  semesters: semester,
  subjects: subject,
  assessments: assessment,
  assignments: assignment,
  exams: exam,
  study_sessions: session,
  goals: goal,
  skills: skill,
} as const;
export type RecordTable = keyof typeof RECORD_SCHEMAS;
export const isRecordTable = (t: string): t is RecordTable => t in RECORD_SCHEMAS;

export const idParam = uuid;

export const chatSchema = z.strictObject({
  message: text(1500),
  mode: z.enum(["default", "simple", "example", "exam", "deep"]).optional(),
});
export const explainSchema = z.strictObject({
  topic: text(200),
  subject: optText(120),
  mode: z.enum(["simple", "example", "exam", "deep", "visual"]),
});
export const whatIfSchema = z.strictObject({
  subjects: z.array(z.strictObject({ subject_id: uuid.optional(), name: optText(120), credits: z.number().min(0).max(20), percent: z.number().min(0).max(100) })).min(1).max(20),
});
export const targetSchema = z.strictObject({
  target: z.number().min(0).max(10),
  remaining_credits: z.number().min(1).max(400),
});
export const planSchema = z.strictObject({
  days: z.int().min(1).max(14).optional(),
  minutes_per_day: z.int().min(30).max(480).optional(),
});
export const authSchema = z.strictObject({
  email: z.email().max(254),
  password: z.string().min(8).max(72),
  full_name: optText(100),
});
export const emailSchema = z.strictObject({ email: z.email().max(254) });
export const careerAdviceSchema = z.strictObject({ path_id: z.string().max(40) });
