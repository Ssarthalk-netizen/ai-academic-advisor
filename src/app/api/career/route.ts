import { NextResponse } from "next/server";
import { requireUser } from "@/lib/data/auth";
import { loadRecord } from "@/lib/data/record";
import { CAREER_PATHS, matchCareers, skillGap } from "@/lib/academics/careers";
import { recommendCourses } from "@/lib/ml/recommender";
import { route } from "@/lib/security/errors";

/** Career pathway explorer + skill-gap analysis (knowledge base, deterministic). */
export const GET = route(async () => {
  const { supabase, user } = await requireUser();
  const rec = await loadRecord(supabase, user.id);
  const matches = matchCareers(rec.profile.interests, rec.subjects.map((s) => s.name), rec.profile.career_goal);
  const paths = CAREER_PATHS.map((p) => {
    const gap = skillGap(p, rec.skills);
    const missing = gap.filter((g) => g.gap > 0).sort((a, b) => b.gap - a.gap);
    const m = matches.find((x) => x.id === p.id)!;
    const courses = recommendCourses({ interests: missing.slice(0, 3).map((g) => g.name), limit: 3 });
    const readiness = Math.round((gap.reduce((s, g) => s + Math.min(g.level, g.target), 0) / gap.reduce((s, g) => s + g.target, 0)) * 100);
    return { ...p, match: m, gap, readiness, courses: [...courses.electives, ...courses.online].slice(0, 4) };
  }).sort((a, b) => b.match.score - a.match.score);
  return NextResponse.json({ paths, skills: rec.skills });
});
