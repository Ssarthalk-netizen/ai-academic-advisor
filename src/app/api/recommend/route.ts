import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/data/auth";
import { loadRecord } from "@/lib/data/record";
import { recommendCourses } from "@/lib/ml/recommender";
import { overallCgpa } from "@/lib/academics/analytics";
import { route } from "@/lib/security/errors";

const q = z.object({ interests: z.string().max(300).optional(), level: z.enum(["Beginner", "Intermediate", "Advanced"]).optional() });

/** Content-based course recommendations (TF-IDF + cosine) for the student's interests. */
export const GET = route(async (req) => {
  const { supabase, user } = await requireUser();
  const params = q.parse(Object.fromEntries(new URL(req.url).searchParams));
  const rec = await loadRecord(supabase, user.id);
  const interests = params.interests ? params.interests.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10) : rec.profile.interests;
  const cg = overallCgpa(rec);
  const preferLevel = params.level ?? (cg === null ? undefined : cg < 6 ? "Beginner" : cg < 8 ? "Intermediate" : "Advanced");
  const result = recommendCourses({
    interests, goal: rec.profile.career_goal ?? undefined, preferLevel,
    excludeTitles: rec.subjects.map((s) => s.name),
  });
  return NextResponse.json({ ...result, interests, preferLevel });
});
