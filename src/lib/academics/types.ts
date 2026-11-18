// Row shapes mirroring supabase/migrations/0001_init.sql

export type Profile = {
  id: string;
  full_name: string | null;
  university: string | null;
  degree: string | null;
  branch: string | null;
  current_semester: number | null;
  admission_score: number | null;
  date_of_birth: string | null;
  scholarship_holder: boolean;
  fees_up_to_date: boolean;
  has_outstanding_dues: boolean;
  living_away_from_home: boolean;
  interests: string[];
  learning_style: string | null;
  weekly_study_hours: number | null;
  attendance_threshold: number;
  target_cgpa: number | null;
  career_goal: string | null;
  onboarded: boolean;
  ai_consent: boolean;
};

export type Semester = { id: string; number: number; label: string | null; is_current: boolean };

export type Subject = {
  id: string;
  semester_id: string;
  name: string;
  code: string | null;
  credits: number;
  marks_obtained: number | null;
  max_marks: number;
  classes_attended: number;
  classes_total: number;
  difficulty: number | null;
};

export type Assessment = {
  id: string;
  subject_id: string;
  kind: string;
  title: string | null;
  topic: string | null;
  score: number;
  max_score: number;
  taken_on: string | null;
};

export type Assignment = {
  id: string;
  subject_id: string | null;
  title: string;
  description: string | null;
  due_at: string;
  status: "pending" | "in_progress" | "submitted" | "missed";
  est_hours: number | null;
};

export type Exam = {
  id: string;
  subject_id: string | null;
  title: string;
  kind: string;
  exam_date: string;
  syllabus_done: number;
};

export type StudySession = {
  id: string;
  subject_id: string | null;
  topic: string | null;
  planned_date: string;
  planned_minutes: number;
  actual_minutes: number | null;
  status: "planned" | "done" | "missed" | "skipped";
  understanding: number | null;
  source: string;
};

export type Skill = { id: string; name: string; level: number; evidence: string | null };

export type AcademicRecord = {
  profile: Profile;
  semesters: Semester[];
  subjects: Subject[];
  assessments: Assessment[];
  assignments: Assignment[];
  exams: Exam[];
  sessions: StudySession[];
  skills: Skill[];
};
