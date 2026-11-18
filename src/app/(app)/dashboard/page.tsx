"use client";
import Link from "next/link";
import { useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Badge, Empty, Notice, ProgressBar, Section, Skeleton } from "@/components/ui";
import { api, useApi } from "@/lib/client/api";
import { daysUntil, fmtDate, type Overview } from "@/lib/client/types";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Dashboard() {
  const { data, error, loading, reload } = useApi<Overview>("/api/overview");
  const [loadingDemo, setLoadingDemo] = useState(false);

  if (loading && !data) return <div className="space-y-4"><Skeleton className="h-12 w-72" /><Skeleton className="h-56" /><Skeleton className="h-72" /></div>;
  if (error) return <Notice tone="critical" title="Couldn't load your dashboard">{error}</Notice>;
  if (!data) return null;
  const { insights: ins, profile } = data;
  const first = profile.full_name?.split(" ")[0];

  if (data.empty) {
    return (
      <div>
        <h1 className="display text-[36px]">{greeting()}{first ? `, ${first}` : ""}</h1>
        <div className="mt-8">
          <Empty title="Your dashboard fills in once you add a semester"
            action={<div className="flex flex-wrap gap-2">
              <Link href="/academics" className="btn btn-primary">Add my subjects</Link>
              <button className="btn btn-soft" disabled={loadingDemo} onClick={async () => { setLoadingDemo(true); await api("/api/demo", { method: "POST" }).catch(() => {}); setLoadingDemo(false); reload(); }}>
                {loadingDemo ? "Loading sample…" : "Load a sample student"}
              </button>
            </div>}>
            Add at least one semester with subjects and marks (or quiz scores for the current semester). The risk estimate, Risk Radar and planner all start from there.
          </Empty>
        </div>
      </div>
    );
  }

  const risk = ins.wrong.risk;
  const sems = ins.where.semesters.filter((s) => s.sgpa !== null).map((s) => ({ name: s.provisional ? `Sem ${s.number} (so far)` : `Sem ${s.number}`, sgpa: s.sgpa, current: s.isCurrent }));
  const crit = ins.wrong.alerts.filter((a) => a.severity === "critical").length;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-[34px] sm:text-[40px]">{greeting()}{first ? `, ${first}` : ""}</h1>
          <p className="mt-1 text-ink-soft">
            {crit > 0 ? `${crit} thing${crit > 1 ? "s need" : " needs"} your attention this week.` : "Nothing urgent right now. Here's where you stand."}
          </p>
        </div>
        <Link href="/advisor" className="btn btn-primary">Ask the advisor</Link>
      </div>

      {/* Where am I */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr_1fr]">
        <div className="card-butter p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[13px] font-semibold text-ink-soft">CGPA (finished semesters)</div>
              <div className="numeral mt-2 text-[64px]">{ins.where.cgpa?.toFixed(2) ?? "–"}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-[13px] text-ink-soft">
                {ins.where.projectedCgpa !== null && ins.where.projectedCgpa !== ins.where.cgpa && <span>Projected with this semester: <strong className="text-ink">{ins.where.projectedCgpa.toFixed(2)}</strong></span>}
                {profile.target_cgpa && <span>Target: <strong className="text-ink">{Number(profile.target_cgpa).toFixed(1)}</strong></span>}
              </div>
            </div>
            {ins.improving.sgpaTrend !== null && (
              <Badge tone={ins.improving.sgpaTrend >= 0 ? "leaf" : "ember"}>
                {ins.improving.sgpaTrend >= 0 ? "+" : ""}{ins.improving.sgpaTrend} SGPA vs last semester
              </Badge>
            )}
          </div>
          <div className="mt-4 h-32" aria-label="SGPA by semester">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sems} margin={{ left: -24, right: 0, top: 4, bottom: 0 }}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#6b4a3a" }} />
                <YAxis domain={[0, 10]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#a58c7c" }} width={44} />
                <Tooltip cursor={{ fill: "#fef4cc" }} contentStyle={{ borderRadius: 12, border: "1px solid #efe3c4", fontSize: 13 }} formatter={(v) => [v, "SGPA"]} />
                <Bar dataKey="sgpa" radius={[8, 8, 0, 0]} maxBarSize={64}>{sems.map((s) => <Cell key={s.name} fill={s.current ? "#e0600c" : "#3a1607"} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <Link href="/risk" className="group rounded-[18px] bg-ink p-6 text-[#fff8e6] transition-transform hover:-translate-y-0.5">
          <div className="text-[13px] font-semibold text-[#e9d3b5]">Estimated academic risk</div>
          {risk ? (
            <>
              <div className={`numeral mt-3 text-[48px] ${risk.level === "High" ? "text-[#ff9c8a]" : risk.level === "Medium" ? "text-butter" : "text-[#9be3b4]"}`}>{risk.level}</div>
              <div className="mt-1 text-[14px] text-[#e9d3b5]">{Math.round(risk.probability * 100)}% probability from the {risk.model} model</div>
              {risk.factors[0] && <p className="mt-5 text-[13.5px] text-[#f4e2c8]">Biggest factor: {risk.factors[0].label.toLowerCase()}</p>}
              <span className="mt-4 inline-block text-[13px] font-semibold text-butter underline-offset-4 group-hover:underline">See what&apos;s behind it</span>
            </>
          ) : <p className="mt-3 text-[14px] text-[#e9d3b5]">Add marks to get an estimate.</p>}
        </Link>

        <div className="card p-6">
          <div className="text-[13px] font-semibold text-ink-soft">Average attendance this semester</div>
          <div className={`numeral mt-3 text-[48px] ${ins.where.avgAttendance !== null && ins.where.avgAttendance < profile.attendance_threshold ? "text-alarm" : ""}`}>
            {ins.where.avgAttendance !== null ? `${ins.where.avgAttendance}%` : "–"}
          </div>
          <div className="mt-1 text-[13px] text-ink-faint">Rule: {profile.attendance_threshold}% per subject</div>
          <div className="mt-6 text-[13px] font-semibold text-ink-soft">Credits earned</div>
          <div className="numeral mt-1 text-[28px]">{ins.where.creditsEarned}</div>
        </div>
      </div>

      {/* What to do / what's wrong */}
      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="What to do next" aside={<Link href="/planner" className="text-[13px] font-semibold underline-offset-4 hover:underline">Open planner</Link>}>
          <ol className="space-y-3">
            {ins.todo.actions.map((a, i) => (
              <li key={i} className="flex gap-4 rounded-[16px] border border-line bg-white p-4">
                <span className="numeral flex size-9 shrink-0 items-center justify-center rounded-full bg-butter text-[18px]">{i + 1}</span>
                <div><div className="font-semibold leading-snug">{a.title}</div><div className="mt-0.5 text-[13.5px] text-ink-soft">{a.because}</div></div>
              </li>
            ))}
            {ins.todo.actions.length === 0 && <li className="text-ink-soft">You&apos;re on track. Keep following your plan.</li>}
          </ol>
        </Section>
        <Section title="What's going wrong" aside={<Link href="/risk" className="text-[13px] font-semibold underline-offset-4 hover:underline">All alerts ({ins.wrong.alerts.length})</Link>}>
          <div className="space-y-2.5">
            {ins.wrong.alerts.slice(0, 4).map((a) => (
              <Notice key={a.id} tone={a.severity} title={a.title}>{a.evidence}</Notice>
            ))}
            {ins.wrong.alerts.length === 0 && <p className="text-ink-soft">No warnings. Nice.</p>}
          </div>
        </Section>
      </div>

      {/* Subjects */}
      <Section title={`Semester ${profile.current_semester ?? ""} subjects`} aside={<Link href="/academics" className="text-[13px] font-semibold underline-offset-4 hover:underline">Edit records</Link>}>
        <div className="overflow-x-auto rounded-[16px] border border-line bg-white">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead className="border-b border-line text-[12.5px] text-ink-soft">
              <tr><th className="px-4 py-3 font-semibold">Subject</th><th className="px-4 py-3 font-semibold">Marks so far</th><th className="px-4 py-3 font-semibold">Grade</th><th className="px-4 py-3 font-semibold">Attendance</th><th className="px-4 py-3 font-semibold">Trend</th></tr>
            </thead>
            <tbody>
              {ins.currentSubjects.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{s.name}{s.weakTopics.length > 0 && <div className="text-[12px] font-normal text-ink-faint">Weak: {s.weakTopics.join(", ")}</div>}</td>
                  <td className="px-4 py-3">{s.percent !== null ? <span className={s.percent < 40 ? "font-semibold text-alarm" : ""}>{s.percent}%</span> : <span className="text-ink-faint">no marks yet</span>}</td>
                  <td className="px-4 py-3">{s.grade ?? "–"}</td>
                  <td className="w-44 px-4 py-3">{s.attendance !== null ? <div className="flex items-center gap-2"><span className="w-12 tabular-nums">{s.attendance}%</span><ProgressBar value={s.attendance} tone={s.attendance < profile.attendance_threshold ? "alarm" : "leaf"} /></div> : "–"}</td>
                  <td className="px-4 py-3">{s.trend === null ? <span className="text-ink-faint">–</span> : s.trend >= 0
                    ? <span className="inline-flex items-center gap-1 text-leaf"><ArrowUpRight className="size-4" />{s.trend} pts</span>
                    : <span className="inline-flex items-center gap-1 text-ember"><ArrowDownRight className="size-4" />{Math.abs(s.trend)} pts</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <Section title="Coming up" aside={<Link href="/deadlines" className="text-[13px] font-semibold underline-offset-4 hover:underline">All deadlines</Link>}>
          <ul className="divide-y divide-line rounded-[16px] border border-line bg-white">
            {[...ins.upcoming.assignments.map((a) => ({ id: a.id, title: a.title, when: a.due_at, kind: "Assignment", extra: a.status.replace("_", " ") })),
              ...ins.upcoming.exams.map((e) => ({ id: e.id, title: e.title, when: e.exam_date, kind: "Exam", extra: `${e.syllabus_done}% syllabus done` }))]
              .sort((a, b) => a.when.localeCompare(b.when)).slice(0, 6).map((it) => {
                const d = daysUntil(it.when);
                return (
                  <li key={it.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div><div className="font-medium">{it.title}</div><div className="text-[12.5px] text-ink-faint">{it.kind}, {it.extra}</div></div>
                    <Badge tone={d < 0 ? "alarm" : d <= 3 ? "ember" : "plain"}>{d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "today" : `${fmtDate(it.when)}, in ${d}d`}</Badge>
                  </li>
                );
              })}
          </ul>
        </Section>
        <Section title="Where you're heading">
          <div className="card p-5">
            {profile.career_goal && <p className="text-[14px] text-ink-soft">Goal: <strong className="text-ink">{profile.career_goal}</strong></p>}
            <p className="mt-2 text-[13px] font-semibold text-ink-soft">Best matching career paths</p>
            <ul className="mt-2 space-y-1.5">
              {ins.heading.careers.map((c) => <li key={c.id} className="flex justify-between text-[14px]"><span>{c.title}</span><span className="text-ink-faint">match {c.score}</span></li>)}
            </ul>
            <Link href="/career" className="btn btn-soft mt-4">See skill gaps and roadmap</Link>
          </div>
        </Section>
      </div>
    </div>
  );
}
