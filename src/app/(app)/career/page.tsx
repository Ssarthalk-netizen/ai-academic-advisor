"use client";
import { useState } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { AiLabel, Badge, Notice, PageHeader, ProgressBar, Section, Skeleton } from "@/components/ui";
import { api, useApi } from "@/lib/client/api";

type Course = { course_id: string; title: string; category: string; level: string; source: string; url: string; similarity?: number; matched?: string[]; is_paid?: boolean };
type Path = {
  id: string; title: string; summary: string; readiness: number; sequence: string[];
  projects: { level: string; title: string }[];
  match: { score: number; interestHits: string[]; subjectHits: string[] };
  gap: { name: string; target: number; level: number; gap: number; why: string }[];
  courses: Course[];
};
type Roadmap = { summary: string; weeks: { week: string; focus: string; tasks: string[]; milestone: string }[]; first_project: string; subjects_that_help: string[] };

export default function Career() {
  const { data, error, loading, reload } = useApi<{ paths: Path[]; skills: { id: string; name: string; level: number }[] }>("/api/career");
  const [open, setOpen] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<Record<string, Roadmap>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (loading && !data) return <Skeleton className="h-96" />;
  if (error) return <Notice tone="critical">{error}</Notice>;
  if (!data) return null;
  const selected = open ?? data.paths[0]?.id;

  async function setSkill(name: string, level: number) {
    const existing = data!.skills.find((s) => s.name.toLowerCase() === name.toLowerCase());
    try {
      if (existing) await api(`/api/records/skills/${existing.id}`, level === 0 ? { method: "DELETE" } : { method: "PATCH", body: { level } });
      else if (level > 0) await api("/api/records/skills", { body: { name, level } });
      reload();
    } catch (e) { setErr((e as Error).message); }
  }

  async function makeRoadmap(id: string) {
    setBusy(id); setErr(null);
    try {
      const r = await api<{ roadmap: Roadmap }>("/api/career/roadmap", { body: { path_id: id } });
      setRoadmap((m) => ({ ...m, [id]: r.roadmap }));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  }

  return (
    <div className="space-y-10">
      <PageHeader title="Career paths" intro="Paths are ranked by how well they match your interests and the subjects you've studied. Rate your skills to see what's missing." />
      {err && <Notice tone="critical">{err}</Notice>}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <nav aria-label="Career paths" className="space-y-2">
          {data.paths.map((p, i) => (
            <button key={p.id} onClick={() => setOpen(p.id)} aria-current={p.id === selected}
              className={`w-full rounded-[14px] border p-3 text-left ${p.id === selected ? "border-ink bg-butter-soft" : "border-line bg-white hover:border-ink-faint"}`}>
              <div className="flex items-baseline justify-between gap-2"><span className="font-semibold">{p.title}</span>{i === 0 && p.match.score > 0 && <Badge tone="ink">best match</Badge>}</div>
              <div className="mt-2 flex items-center gap-2 text-[12px] text-ink-soft"><ProgressBar value={p.readiness} tone="leaf" /><span className="w-16 shrink-0">{p.readiness}% ready</span></div>
            </button>
          ))}
        </nav>

        {data.paths.filter((p) => p.id === selected).map((p) => (
          <div key={p.id} className="space-y-8">
            <div>
              <h2 className="display text-[30px]">{p.title}</h2>
              <p className="mt-2 text-ink-soft">{p.summary}</p>
              {(p.match.interestHits.length > 0 || p.match.subjectHits.length > 0) && (
                <p className="mt-2 text-[13.5px] text-ink-soft">Why it matches: {[...p.match.interestHits.map((x) => `interest in ${x}`), ...p.match.subjectHits.map((x) => `${x} subjects`)].slice(0, 5).join(", ")}.</p>
              )}
            </div>

            <Section title="Skill gap">
              <div className="overflow-x-auto rounded-[16px] border border-line bg-white">
                <table className="w-full min-w-[560px] text-[14px]">
                  <thead className="border-b border-line text-left text-[12.5px] text-ink-soft"><tr><th className="px-4 py-2.5 font-semibold">Skill</th><th className="px-4 py-2.5 font-semibold">Your level</th><th className="px-4 py-2.5 font-semibold">Needed</th><th className="px-4 py-2.5 font-semibold">Why</th></tr></thead>
                  <tbody>
                    {p.gap.map((g) => (
                      <tr key={g.name} className="border-b border-line last:border-0">
                        <td className="px-4 py-2.5 font-medium">{g.name}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1" role="radiogroup" aria-label={`Your level in ${g.name}`}>
                            {[0, 1, 2, 3, 4, 5].map((l) => (
                              <button key={l} role="radio" aria-checked={g.level === l} onClick={() => setSkill(g.name, l)} title={l === 0 ? "None" : `Level ${l}`}
                                className={`size-6 rounded-full text-[11px] font-semibold ${l === 0 ? "border border-line text-ink-faint" : l <= g.level ? "bg-ink text-[#fff8e6]" : "bg-butter-soft text-ink-faint"}`}>{l === 0 ? "–" : l}</button>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">{g.gap > 0 ? <Badge tone="ember">level {g.target}, {g.gap} to go</Badge> : <Badge tone="leaf">done</Badge>}</td>
                        <td className="px-4 py-2.5 text-ink-soft">{g.why}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <div className="grid gap-8 md:grid-cols-2">
              <Section title="Learning order">
                <ol className="space-y-1.5 text-[14px]">{p.sequence.map((s, i) => <li key={s} className="flex gap-3"><span className="numeral w-5 text-ink-faint">{i + 1}</span>{s}</li>)}</ol>
              </Section>
              <Section title="Projects to build">
                <ul className="space-y-2 text-[14px]">{p.projects.map((pr) => <li key={pr.title} className="flex items-start gap-2"><Badge tone="plain">{pr.level}</Badge><span>{pr.title}</span></li>)}</ul>
              </Section>
            </div>

            <Section title="Courses for your biggest gaps">
              <CourseList courses={p.courses} />
            </Section>

            <Section title="12-week roadmap">
              {roadmap[p.id] ? (
                <div className="card p-5">
                  <p>{roadmap[p.id].summary}</p>
                  <ol className="mt-4 space-y-3">
                    {roadmap[p.id].weeks.map((w) => (
                      <li key={w.week} className="rounded-[12px] bg-butter-soft/60 p-3">
                        <div className="font-semibold">Weeks {w.week}: {w.focus}</div>
                        <ul className="mt-1 list-disc pl-5 text-[14px] text-ink-soft">{w.tasks.map((t) => <li key={t}>{t}</li>)}</ul>
                        <div className="mt-1 text-[13px]"><span className="font-semibold">Milestone:</span> {w.milestone}</div>
                      </li>
                    ))}
                  </ol>
                  {roadmap[p.id].first_project && <p className="mt-4 text-[14px]"><span className="font-semibold">First project:</span> {roadmap[p.id].first_project}</p>}
                  <AiLabel />
                </div>
              ) : (
                <button className="btn btn-primary" disabled={busy === p.id} onClick={() => makeRoadmap(p.id)}>
                  <Sparkles className="size-4" />{busy === p.id ? "Writing your roadmap…" : "Write my 12-week roadmap"}
                </button>
              )}
            </Section>
          </div>
        ))}
      </div>

      <Recommender />
    </div>
  );
}

function CourseList({ courses }: { courses: Course[] }) {
  if (!courses.length) return <p className="text-[14px] text-ink-soft">No matching courses. Your skills already cover this path.</p>;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {courses.map((c) => (
        <li key={c.course_id} className="rounded-[14px] border border-line bg-white p-3 text-[14px]">
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium leading-snug">{c.title}</span>
            {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer nofollow" className="shrink-0 text-ink-soft hover:text-ink" aria-label={`Open ${c.title} on Udemy`}><ExternalLink className="size-4" /></a>}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5"><Badge tone={c.source === "University elective" ? "butter" : "plain"}>{c.source === "University elective" ? "Elective" : "Udemy"}</Badge><Badge tone="plain">{c.level}</Badge></div>
        </li>
      ))}
    </ul>
  );
}

function Recommender() {
  const [q, setQ] = useState("");
  const [url, setUrl] = useState("/api/recommend");
  const { data, loading } = useApi<{ electives: Course[]; online: Course[]; coldStart: boolean; interests: string[]; preferLevel?: string }>(url);
  return (
    <Section title="Find courses by interest">
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); setUrl(`/api/recommend?interests=${encodeURIComponent(q)}`); }}>
        <label htmlFor="rq" className="sr-only">Interests</label>
        <input id="rq" className="field max-w-md" maxLength={300} value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. deep learning, cloud, ui design (comma separated)" />
        <button className="btn btn-primary">Recommend</button>
      </form>
      {data && <p className="mt-2 text-[13px] text-ink-faint">
        {data.coldStart ? "No interests yet, so these are the most popular courses." : `Matched on: ${data.interests.join(", ")}${data.preferLevel ? `. Leaning ${data.preferLevel.toLowerCase()} level, based on your CGPA.` : "."}`}
        {" "}Content-based TF-IDF + cosine similarity over 3,720 courses.
      </p>}
      {loading ? <Skeleton className="mt-4 h-40" /> : data && (
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div><h3 className="mb-2 font-semibold">University electives</h3><CourseList courses={data.electives} /></div>
          <div><h3 className="mb-2 font-semibold">Online courses</h3><CourseList courses={data.online} /></div>
        </div>
      )}
    </Section>
  );
}
