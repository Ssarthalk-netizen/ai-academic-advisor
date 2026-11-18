/**
 * Deterministic grading maths — no AI involved (blueprint rule: never let an
 * LLM invent calculations). The scale below is the common UGC 10-point scheme;
 * edit GRADE_SCALE if your university uses different bands.
 */

export type GradeBand = { min: number; grade: string; points: number };

export const GRADE_SCALE: GradeBand[] = [
  { min: 90, grade: "O", points: 10 },
  { min: 80, grade: "A+", points: 9 },
  { min: 70, grade: "A", points: 8 },
  { min: 60, grade: "B+", points: 7 },
  { min: 55, grade: "B", points: 6 },
  { min: 50, grade: "C", points: 5 },
  { min: 40, grade: "P", points: 4 },
  { min: 0, grade: "F", points: 0 },
];
export const PASS_PERCENT = 40;

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function gradeFor(percent: number): GradeBand {
  const p = Math.max(0, Math.min(100, percent));
  return GRADE_SCALE.find((b) => p >= b.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1];
}

/** Lowest percentage that earns at least `points` grade points (null if impossible). */
export function minPercentForPoints(points: number): number | null {
  const ok = [...GRADE_SCALE].reverse().find((b) => b.points >= points);
  return ok ? ok.min : null;
}

export type GradedSubject = { credits: number; percent: number };

export function sgpa(subjects: GradedSubject[]): number | null {
  const credits = subjects.reduce((s, x) => s + x.credits, 0);
  if (credits <= 0) return null;
  const pts = subjects.reduce((s, x) => s + x.credits * gradeFor(x.percent).points, 0);
  return round2(pts / credits);
}

/** CGPA = credit-weighted mean of grade points over every graded subject. */
export function cgpa(semesters: GradedSubject[][]): number | null {
  return sgpa(semesters.flat());
}

export function totals(subjects: GradedSubject[]) {
  return {
    credits: subjects.reduce((s, x) => s + x.credits, 0),
    points: subjects.reduce((s, x) => s + x.credits * gradeFor(x.percent).points, 0),
  };
}

/**
 * What-if: given finished semesters and hypothetical marks for the current
 * semester, return the projected SGPA and CGPA.
 */
export function whatIf(done: GradedSubject[], hypothetical: GradedSubject[]) {
  const projectedSgpa = sgpa(hypothetical);
  const projectedCgpa = sgpa([...done, ...hypothetical]);
  const currentCgpa = sgpa(done);
  return {
    currentCgpa,
    projectedSgpa,
    projectedCgpa,
    change: currentCgpa !== null && projectedCgpa !== null ? round2(projectedCgpa - currentCgpa) : null,
    subjects: hypothetical.map((s) => ({ ...s, ...gradeFor(s.percent) })),
  };
}

/**
 * Target planner: SGPA needed over `remainingCredits` to reach `target` CGPA.
 * feasible=false when even straight O grades are not enough.
 */
export function requiredForTarget(done: GradedSubject[], remainingCredits: number, target: number) {
  const { credits, points } = totals(done);
  if (remainingCredits <= 0) {
    return { requiredSgpa: null, feasible: false, reason: "No remaining credits entered." };
  }
  const need = (target * (credits + remainingCredits) - points) / remainingCredits;
  const requiredSgpa = round2(Math.max(0, need));
  const feasible = need <= 10;
  const bandPoints = Math.ceil(Math.min(10, Math.max(0, need)));
  return {
    requiredSgpa,
    feasible,
    minAveragePercent: feasible ? minPercentForPoints(bandPoints) : null,
    reason: feasible
      ? need <= 0
        ? "You are already above this target. Keep passing every subject."
        : `Average about ${requiredSgpa} SGPA over the remaining ${remainingCredits} credits.`
      : `Not reachable with ${remainingCredits} credits. Even all O grades give at most ${round2(
          (points + 10 * remainingCredits) / (credits + remainingCredits),
        )}.`,
  };
}

export const attendancePercent = (attended: number, total: number) => (total > 0 ? round2((attended / total) * 100) : null);

/** Consecutive classes that must be attended to reach the threshold. */
export function classesToReach(attended: number, total: number, thresholdPct: number): number {
  const th = thresholdPct / 100;
  if (total === 0 || attended / total >= th) return 0;
  if (th >= 1) return Infinity;
  return Math.ceil((th * total - attended) / (1 - th));
}

/** How many classes can be skipped while staying at/above the threshold. */
export function classesCanMiss(attended: number, total: number, thresholdPct: number): number {
  const th = thresholdPct / 100;
  if (th <= 0) return Infinity;
  return Math.max(0, Math.floor(attended / th - total));
}
