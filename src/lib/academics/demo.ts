/**
 * Clearly-labelled SAMPLE data for demos ("Load sample data" button).
 * A 2nd-year B.Tech student: Sem 1 and 2 finished, Sem 3 in progress with a
 * few weak spots so every feature has something to show.
 */

const DAY = 864e5;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();
const date = (offsetDays: number) => iso(offsetDays).slice(0, 10);

type S = { name: string; code: string; credits: number; marks?: number; att: [number, number]; diff?: number };

export const DEMO_PROFILE = {
  full_name: "Sample Student",
  university: "Sample University",
  degree: "B.Tech",
  branch: "Computer Science (AI & ML)",
  current_semester: 3,
  admission_score: 78,
  scholarship_holder: false,
  fees_up_to_date: true,
  has_outstanding_dues: false,
  living_away_from_home: true,
  interests: ["machine learning", "python", "web development"],
  learning_style: "practice",
  weekly_study_hours: 18,
  attendance_threshold: 75,
  target_cgpa: 8,
  career_goal: "AI / Machine Learning Engineer",
  onboarded: true,
};

export const DEMO_SEMESTERS: { number: number; is_current: boolean; subjects: S[] }[] = [
  {
    number: 1, is_current: false, subjects: [
      { name: "Engineering Mathematics I", code: "MA101", credits: 4, marks: 74, att: [44, 50] },
      { name: "Programming in C", code: "CS101", credits: 4, marks: 86, att: [46, 50] },
      { name: "Engineering Physics", code: "PH101", credits: 3, marks: 63, att: [38, 45] },
      { name: "Basic Electrical Engineering", code: "EE101", credits: 3, marks: 58, att: [36, 45] },
      { name: "Communication Skills", code: "HS101", credits: 2, marks: 81, att: [27, 30] },
    ],
  },
  {
    number: 2, is_current: false, subjects: [
      { name: "Engineering Mathematics II", code: "MA102", credits: 4, marks: 61, att: [40, 50] },
      { name: "Object Oriented Programming in Java", code: "CS102", credits: 4, marks: 79, att: [45, 50] },
      { name: "Digital Electronics", code: "EC102", credits: 3, marks: 52, att: [35, 45] },
      { name: "Engineering Graphics", code: "ME102", credits: 3, marks: 70, att: [40, 45] },
      { name: "Environmental Studies", code: "HS102", credits: 2, marks: 88, att: [28, 30] },
    ],
  },
  {
    number: 3, is_current: true, subjects: [
      { name: "Data Structures & Algorithms", code: "CS201", credits: 4, att: [30, 36], diff: 4 },
      { name: "AI & ML Essentials", code: "E0523A", credits: 4, att: [33, 36], diff: 3 },
      { name: "Discrete Mathematics", code: "MA201", credits: 3, att: [24, 34], diff: 5 },
      { name: "Database Management Systems", code: "CS202", credits: 3, att: [29, 34], diff: 2 },
      { name: "Computer Organisation", code: "CS203", credits: 3, att: [25, 32], diff: 3 },
    ],
  },
];

// Assessments for current-semester subjects: [subject code, kind, title, topic, score, max, daysAgo]
export const DEMO_ASSESSMENTS: [string, string, string, string, number, number, number][] = [
  ["CS201", "quiz", "Quiz 1", "Arrays & linked lists", 8, 10, 60],
  ["CS201", "assignment", "Assignment 1", "Stacks & queues", 17, 20, 45],
  ["CS201", "quiz", "Quiz 2", "Trees", 5, 10, 25],
  ["CS201", "midterm", "Mid-term", "Trees", 18, 40, 12],
  ["E0523A", "quiz", "Quiz 1", "Foundations of AI", 9, 10, 55],
  ["E0523A", "assignment", "Unit 1 homework", "Knowledge representation", 18, 20, 40],
  ["E0523A", "midterm", "Mid-term", "Probabilistic reasoning", 29, 40, 12],
  ["MA201", "quiz", "Quiz 1", "Logic & proofs", 6, 10, 58],
  ["MA201", "quiz", "Quiz 2", "Graph theory", 3, 10, 30],
  ["MA201", "midterm", "Mid-term", "Graph theory", 14, 40, 12],
  ["CS202", "quiz", "Quiz 1", "ER modelling", 9, 10, 50],
  ["CS202", "midterm", "Mid-term", "Normalization", 32, 40, 12],
  ["CS203", "quiz", "Quiz 1", "Number systems", 7, 10, 52],
  ["CS203", "midterm", "Mid-term", "Memory hierarchy", 22, 40, 12],
];

// [subject code | null, title, dueInDays, status, est hours]
export const DEMO_ASSIGNMENTS: [string | null, string, number, string, number][] = [
  ["CS201", "Implement AVL tree insertion", 2, "in_progress", 4],
  ["E0523A", "AI Academic Advisor project", 2, "in_progress", 10],
  ["MA201", "Graph theory problem set 3", -1, "pending", 3],
  ["CS202", "SQL lab record", 6, "pending", 2],
];

// [subject code, title, kind, inDays, syllabus %]
export const DEMO_EXAMS: [string, string, string, number, number][] = [
  ["MA201", "Discrete Maths end-term", "endterm", 12, 40],
  ["CS201", "DSA end-term", "endterm", 15, 55],
  ["E0523A", "AI & ML end-term", "endterm", 18, 70],
  ["CS202", "DBMS end-term", "endterm", 20, 75],
  ["CS203", "COA end-term", "endterm", 22, 50],
];

export const DEMO_SKILLS: [string, number, string][] = [
  ["Python", 3, "Course projects + this app"],
  ["Machine Learning (scikit-learn)", 2, "AIML Essentials coursework"],
  ["SQL", 2, "DBMS labs"],
  ["Git", 2, "College projects"],
  ["HTML/CSS", 3, "Personal website"],
];

/** Last week's study history, with a few missed sessions for the Reality Check. */
export const DEMO_SESSIONS: [string, number, string, number | null, number][] = [
  // [subject code, daysAgo, status, actualMinutes, plannedMinutes]
  ["CS201", 6, "done", 60, 60],
  ["MA201", 6, "missed", null, 60],
  ["E0523A", 5, "done", 45, 60],
  ["MA201", 4, "missed", null, 90],
  ["CS203", 3, "done", 60, 60],
  ["CS201", 2, "skipped", null, 60],
  ["MA201", 1, "missed", null, 60],
  ["CS202", 1, "done", 40, 45],
];

export const demoHelpers = { iso, date };
