"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge, Notice, PageHeader, ProgressBar, Section, Skeleton } from "@/components/ui";
import { api, useApi } from "@/lib/client/api";
import { daysUntil, fmtDate } from "@/lib/client/types";

type Subject = { id: string; name: string; semester_id: string };
type Assignment = { id: string; subject_id: string | null; title: string; due_at: string; status: string; est_hours: number | null };
type Exam = { id: string; subject_id: string | null; title: string; kind: string; exam_date: string; syllabus_done: number };

const STATUS = [["pending", "Not started"], ["in_progress", "In progress"], ["submitted", "Submitted"], ["missed", "Missed"]] as const;

export default function Deadlines() {
  const subs = useApi<{ data: Subject[] }>("/api/records/subjects");
  const asg = useApi<{ data: Assignment[] }>("/api/records/assignments");
  const ex = useApi<{ data: Exam[] }>("/api/records/exams");
  const [error, setError] = useState<string | null>(null);
  const name = new Map((subs.data?.data ?? []).map((s) => [s.id, s.name]));

  async function run(fn: () => Promise<unknown>, reload: () => void) {
    setError(null);
    try { await fn(); reload(); } catch (e) { setError((e as Error).message); }
  }
  if (asg.loading && !asg.data) return <Skeleton className="h-96" />;

  const assignments = [...(asg.data?.data ?? [])].sort((a, b) => a.due_at.localeCompare(b.due_at));
  const exams = [...(ex.data?.data ?? [])].sort((a, b) => a.exam_date.localeCompare(b.exam_date));
  const subjectOptions = (subs.data?.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>);

  return (
    <div className="space-y-10">
      <PageHeader title="Deadlines and exams" intro="Everything with a date. Risk Radar warns you 3 days before an assignment is due and 3 weeks before an exam if the syllabus is behind." />
      {error && <Notice tone="critical">{error}</Notice>}

      <Section title="Exams">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {exams.map((e) => {
            const d = daysUntil(e.exam_date);
            return (
              <div key={e.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div><div className="font-semibold">{e.title}</div><div className="text-[12.5px] text-ink-faint">{e.subject_id ? name.get(e.subject_id) : "No subject"}, {fmtDate(e.exam_date)}</div></div>
                  <button className="text-alarm" aria-label={`Delete ${e.title}`} onClick={() => run(() => api(`/api/records/exams/${e.id}`, { method: "DELETE" }), ex.reload)}><Trash2 className="size-4" /></button>
                </div>
                <div className="mt-3 flex items-baseline gap-2"><span className={`numeral text-[36px] ${d <= 7 && d >= 0 ? "text-ember" : ""}`}>{d < 0 ? "done" : d}</span>{d >= 0 && <span className="text-[13px] text-ink-soft">day{d === 1 ? "" : "s"} left</span>}</div>
                <label className="mt-3 block text-[13px] text-ink-soft">Syllabus covered: <strong className="text-ink">{e.syllabus_done}%</strong>
                  <input type="range" min={0} max={100} step={5} defaultValue={e.syllabus_done} className="mt-1 w-full accent-[#3a1607]"
                    onMouseUp={(ev) => run(() => api(`/api/records/exams/${e.id}`, { method: "PATCH", body: { syllabus_done: Number((ev.target as HTMLInputElement).value) } }), ex.reload)}
                    onKeyUp={(ev) => run(() => api(`/api/records/exams/${e.id}`, { method: "PATCH", body: { syllabus_done: Number((ev.target as HTMLInputElement).value) } }), ex.reload)} />
                </label>
                <div className="mt-1"><ProgressBar value={e.syllabus_done} tone={e.syllabus_done < 60 && d <= 21 ? "ember" : "leaf"} /></div>
              </div>
            );
          })}
        </div>
        <form className="card-butter mt-4 grid gap-3 p-4 sm:grid-cols-5" onSubmit={(e) => {
          e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
          run(() => api("/api/records/exams", { body: { title: f.get("title"), subject_id: f.get("subject_id") || null, kind: f.get("kind"), exam_date: f.get("exam_date"), syllabus_done: Number(f.get("syllabus_done") || 0) } }), ex.reload).then(() => form.reset());
        }}>
          <label className="sm:col-span-2"><span className="label">Exam</span><input name="title" required maxLength={150} className="field" placeholder="DSA end-term" /></label>
          <label><span className="label">Subject</span><select name="subject_id" className="field"><option value="">None</option>{subjectOptions}</select></label>
          <label><span className="label">Type</span><select name="kind" className="field"><option value="endterm">End-term</option><option value="midterm">Mid-term</option><option value="practical">Practical</option><option value="quiz">Quiz</option><option value="other">Other</option></select></label>
          <label><span className="label">Date</span><input name="exam_date" type="date" required className="field" /></label>
          <div className="sm:col-span-5"><button className="btn btn-primary"><Plus className="size-4" />Add exam</button></div>
        </form>
      </Section>

      <Section title="Assignments">
        <ul className="divide-y divide-line rounded-[16px] border border-line bg-white">
          {assignments.map((a) => {
            const d = daysUntil(a.due_at);
            return (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-56 flex-1"><div className="font-medium">{a.title}</div><div className="text-[12.5px] text-ink-faint">{a.subject_id ? name.get(a.subject_id) : "No subject"}{a.est_hours ? `, about ${a.est_hours} h` : ""}</div></div>
                <Badge tone={a.status === "submitted" ? "leaf" : d < 0 ? "alarm" : d <= 3 ? "ember" : "plain"}>
                  {a.status === "submitted" ? "submitted" : d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "due today" : `due ${fmtDate(a.due_at)}`}
                </Badge>
                <select aria-label={`Status of ${a.title}`} value={a.status} className="field w-36 py-1.5"
                  onChange={(e) => run(() => api(`/api/records/assignments/${a.id}`, { method: "PATCH", body: { status: e.target.value } }), asg.reload)}>
                  {STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button className="text-alarm" aria-label={`Delete ${a.title}`} onClick={() => run(() => api(`/api/records/assignments/${a.id}`, { method: "DELETE" }), asg.reload)}><Trash2 className="size-4" /></button>
              </li>
            );
          })}
          {assignments.length === 0 && <li className="px-4 py-4 text-ink-soft">No assignments yet.</li>}
        </ul>
        <form className="card-butter mt-4 grid gap-3 p-4 sm:grid-cols-5" onSubmit={(e) => {
          e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
          const due = new Date(`${f.get("due")}T23:59:00`).toISOString();
          run(() => api("/api/records/assignments", { body: { title: f.get("title"), subject_id: f.get("subject_id") || null, due_at: due, est_hours: f.get("est_hours") ? Number(f.get("est_hours")) : null } }), asg.reload).then(() => form.reset());
        }}>
          <label className="sm:col-span-2"><span className="label">Assignment</span><input name="title" required maxLength={150} className="field" placeholder="Lab record 4" /></label>
          <label><span className="label">Subject</span><select name="subject_id" className="field"><option value="">None</option>{subjectOptions}</select></label>
          <label><span className="label">Due date</span><input name="due" type="date" required className="field" /></label>
          <label><span className="label">Hours of work</span><input name="est_hours" type="number" min={0} max={100} step="0.5" className="field" /></label>
          <div className="sm:col-span-5"><button className="btn btn-primary"><Plus className="size-4" />Add assignment</button></div>
        </form>
      </Section>
    </div>
  );
}
