import "server-only";
import catalog from "./models/courses.json";

/**
 * Content-based course recommender: TF-IDF (unigrams + bigrams, sublinear tf,
 * English stop words removed) over each course's title, category, keywords and
 * level, then cosine similarity against the student's interest profile.
 * Cold start: when the student gives no interests, fall back to popularity
 * within their level.
 */

export type Course = {
  course_id: string;
  title: string;
  category: string;
  level: string;
  source: string;
  url: string;
  popularity: number;
  price: number;
  is_paid: boolean;
  keywords: string;
};

const COURSES = catalog as Course[];

const STOP = new Set(
  ("a about above after again against all am an and any are as at be because been before being below between both but by can " +
    "course courses complete could did do does doing down during each few for from further had has have having he her here hers " +
    "how i if in into is it its itself just me more most my no nor not now of off on once only or other our out over own same she " +
    "should so some such than that the their them then there these they this those through to too under until up very was we were " +
    "what when where which while who whom why will with you your learn learning beginners beginner guide using step")
    .split(" "),
);

function tokens(text: string): string[] {
  const words = (text.toLowerCase().match(/[a-z0-9+#]{2,}/g) ?? []).filter((w) => !STOP.has(w));
  const out = [...words];
  for (let i = 0; i < words.length - 1; i++) out.push(`${words[i]} ${words[i + 1]}`);
  return out;
}

// Build the index once per server instance
const docs = COURSES.map((c) => tokens(`${c.title} ${c.category} ${c.keywords} ${c.level}`));
const df = new Map<string, number>();
for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);
const N = docs.length;
const idf = (t: string) => Math.log((1 + N) / (1 + (df.get(t) ?? 0))) + 1;

function tfidf(ts: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of ts) if (df.has(t)) tf.set(t, (tf.get(t) ?? 0) + 1);
  let norm = 0;
  for (const [t, c] of tf) {
    const v = (1 + Math.log(c)) * idf(t);
    tf.set(t, v);
    norm += v * v;
  }
  norm = Math.sqrt(norm) || 1;
  for (const [t, v] of tf) tf.set(t, v / norm);
  return tf;
}

const vectors = docs.map(tfidf);

export type Recommendation = Course & { score: number; similarity: number; matched: string[] };

export function recommendCourses(opts: {
  interests: string[];
  goal?: string;
  preferLevel?: "Beginner" | "Intermediate" | "Advanced";
  excludeTitles?: string[];
  limit?: number;
}): { electives: Recommendation[]; online: Recommendation[]; coldStart: boolean } {
  const limit = opts.limit ?? 5;
  const query = [...opts.interests, opts.goal ?? ""].join(" ").trim();
  const exclude = new Set((opts.excludeTitles ?? []).map((t) => t.toLowerCase()));
  const coldStart = query.length === 0;
  const q = tfidf(tokens(query));

  const scored = COURSES.map((c, i) => {
    let sim = 0;
    const matched: string[] = [];
    for (const [t, v] of q) {
      const w = vectors[i].get(t);
      if (w) {
        sim += v * w;
        if (!t.includes(" ")) matched.push(t);
      }
    }
    const levelBonus = opts.preferLevel && (c.level === opts.preferLevel || c.level === "All Levels") ? 0.05 : 0;
    const score = coldStart ? c.popularity + levelBonus : 0.85 * sim + 0.1 * c.popularity + levelBonus;
    return { ...c, score, similarity: sim, matched };
  }).filter((c) => !exclude.has(c.title.toLowerCase()) && (coldStart || c.similarity > 0));

  const pick = (source: string) =>
    scored.filter((c) => c.source === source).sort((a, b) => b.score - a.score).slice(0, limit);
  return { electives: pick("University elective"), online: pick("Online (Udemy)"), coldStart };
}

export const catalogSize = COURSES.length;
