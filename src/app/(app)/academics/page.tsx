"use client";
import { useMemo, useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Empty, Notice, PageHeader, Skeleton } from "@/components/ui";
import { api, useApi } from "@/lib/client/api";

type Semester = { id: string; number: number; is_current: boolean };
type Subject = { id: string; semester_id: string; name: string; code: string | null; credits: number; marks_obtained: number | null; max_marks: number; classes_attended: number; classes_total: number; difficulty: number | null };
type Assessment = { id: string; subject_id: string; kind: string; title: string | null; topic: string | null; score: number; max_score: number; taken_on: string | null };

const num = (v: FormDataEntryValue | null) => (v === null || v === "" ? null : Number(v));

export default function Academics() {
  const sems = useApi<{ data: Semester[] }>("/api/records/semesters");
  const subs = useApi<{ data: Subject[] }>("/api/records/subjects");
  const asses = useApi<{ data: Assessment[] }>("/api/records/assessments");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const semesters = useMemo(() => [...(sems.data?.data ?? [])].sort((a, b) => a.number - b.number), [sems.data]);
  const current = selected ?? semesters.find((s) => s.is_current)?.id ?? semesters[semesters.length - 1]?.id ?? null;
  const sem = semesters.find((s) => s.id === current);
  const subjects = (subs.data?.data ?? []).filter((s) => s.semester_id === current);

  async function run(fn: () => Promise<unknown>, reload: (() => void)[]) {
    setError(null);
    try { await fn(); reload.forEach((r) => r()); } catch (e) { setError((e as Error).message); }
  }

  async function addSemester() {
    const next = (semesters[semesters.length - 1]?.number ?? 0) + 1;
    await run(() => api("/api/records/semesters", { body: { number: next, label: `Semester ${next}`, is_current: true } }), [sems.reload]);
    setSelected(null);
  }

  if (sems.loading && !sems.data) return <Skeleton className="h-96" />;

  return (
    <div>
      <PageHeader title="My records" intro="Finished semesters need final marks. For the current semester, add quiz and mid-term scores. They are used as provisional marks until results are out." />
      {error && <div className="mb-4"><Notice tone="critical">{error}</Notice></div>}

      {semesters.length === 0 ? (
        <Empty title="Start by adding your first semester" action={<button className="btn btn-primary" onClick={addSemester}><Plus className="size-4" />Add semester 1</button>}>
          Add each semester you&apos;ve studied, then its subjects. The most recent one is marked as current.
        </Empty>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-2" role="tablist" aria-label="Semesters">
            {semesters.map((s) => (
              <button key={s.id} role="tab" aria-selected={s.id === current} onClick={() => setSelected(s.id)}
                className={`rounded-full px-4 py-1.5 text-[14px] font-medium ${s.id === current ? "bg-ink text-[#fff8e6]" : "bg-butter-soft text-ink-soft hover:bg-butter"}`}>
                Semester {s.number}{s.is_current ? " (current)" : ""}
              </button>
            ))}
            <button className="btn btn-ghost" onClick={addSemester}><Plus className="size-4" />Add semester</button>
          </div>

          {sem && (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px]">
              {!sem.is_current && <button className="btn btn-soft py-1.5" onClick={() => run(() => api(`/api/records/semesters/${sem.id}`, { method: "PATCH", body: { is_current: true } }), [sems.reload])}>Mark as current semester</button>}
              <button className="btn btn-ghost py-1.5 text-alarm" onClick={() => confirm(`Delete semester ${sem.number} and all its subjects?`) && run(() => api(`/api/records/semesters/${sem.id}`, { method: "DELETE" }), [sems.reload, subs.reload, asses.reload]).then(() => setSelected(null))}>
                <Trash2 className="size-4" />Delete semester
              </button>
            </div>
          )}

          <div className="space-y-3">
            {subjects.map((s) => (
              <SubjectRow key={s.id} s={s} current={!!sem?.is_current} assessments={(asses.data?.data ?? []).filter((a) => a.subject_id === s.id)}
                onSave={(body) => run(() => api(`/api/records/subjects/${s.id}`, { method: "PATCH", body }), [subs.reload])}
                onDelete={() => confirm(`Delete ${s.name}?`) && run(() => api(`/api/records/subjects/${s.id}`, { method: "DELETE" }), [subs.reload, asses.reload])}
                onAddAssessment={(body) => run(() => api("/api/records/assessments", { body: { ...body, subject_id: s.id } }), [asses.reload])}
                onDeleteAssessment={(id) => run(() => api(`/api/records/assessments/${id}`, { method: "DELETE" }), [asses.reload])} />
            ))}
            {subjects.length === 0 && !adding && <p className="text-ink-soft">No subjects in this semester yet.</p>}
          </div>

          {adding ? (
            <div className="card mt-4 p-5">
              <h2 className="mb-4 font-semibold">Add a subject</h2>
              <SubjectForm current={!!sem?.is_current} onCancel={() => setAdding(false)}
                onSubmit={async (body) => { await run(() => api("/api/records/subjects", { body: { ...body, semester_id: current } }), [subs.reload]); setAdding(false); }} />
            </div>
          ) : (
            <button className="btn btn-primary mt-5" onClick={() => setAdding(true)}><Plus className="size-4" />Add subject</button>
          )}
        </>
      )}
    </div>
  );
}

function SubjectRow({ s, current, assessments, onSave, onDelete, onAddAssessment, onDeleteAssessment }: {
  s: Subject; current: boolean; assessments: Assessment[];
  onSave: (b: Record<string, unknown>) => Promise<void>; onDelete: () => void;
  onAddAssessment: (b: Record<string, unknown>) => Promise<void>; onDeleteAssessment: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const pct = s.marks_obtained !== null ? Math.round((Number(s.marks_obtained) / Number(s.max_marks)) * 1000) / 10 : null;
  const att = s.classes_total > 0 ? Math.round((s.classes_attended / s.classes_total) * 1000) / 10 : null;
  return (
    <div className="rounded-[16px] border border-line bg-white">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <div className="min-w-48 flex-1">
          <div className="font-semibold">{s.name}</div>
          <div className="text-[12.5px] text-ink-faint">{[s.code, `${Number(s.credits)} credits`].filter(Boolean).join(", ")}</div>
        </div>
        <div className="text-[13.5px]"><span className="text-ink-faint">Final marks </span>{pct !== null ? `${s.marks_obtained}/${s.max_marks} (${pct}%)` : current ? "not out yet" : "missing"}</div>
        <div className="text-[13.5px]"><span className="text-ink-faint">Attendance </span>{att !== null ? `${s.classes_attended}/${s.classes_total} (${att}%)` : "–"}</div>
        <div className="flex gap-1">
          <button className="btn btn-ghost px-2.5" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            Assessments ({assessments.length})<ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          <button className="btn btn-ghost px-2.5" onClick={() => setEditing((e) => !e)} aria-label={`Edit ${s.name}`}><Pencil className="size-4" /></button>
          <button className="btn btn-ghost px-2.5 text-alarm" onClick={onDelete} aria-label={`Delete ${s.name}`}><Trash2 className="size-4" /></button>
        </div>
      </div>
      {editing && <div className="border-t border-line p-4"><SubjectForm initial={s} current={current} onCancel={() => setEditing(false)} onSubmit={async (b) => { await onSave(b); setEditing(false); }} /></div>}
      {open && (
        <div className="border-t border-line p-4">
          {assessments.length > 0 && (
            <ul className="mb-4 space-y-1.5">
              {assessments.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-butter-soft/60 px-3 py-2 text-[13.5px]">
                  <span><Badge tone="plain">{a.kind}</Badge> <strong className="ml-1">{a.title ?? a.kind}</strong>{a.topic && <span className="text-ink-soft">, {a.topic}</span>}</span>
                  <span className="flex items-center gap-3">
                    <span className={Number(a.score) / Number(a.max_score) < 0.5 ? "font-semibold text-ember" : ""}>{a.score}/{a.max_score}</span>
                    <span className="text-ink-faint">{a.taken_on ?? ""}</span>
                    <button className="text-alarm" onClick={() => onDeleteAssessment(a.id)} aria-label="Delete assessment"><Trash2 className="size-4" /></button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <AssessmentForm onSubmit={onAddAssessment} />
        </div>
      )}
    </div>
  );
}

function SubjectForm({ initial, current, onSubmit, onCancel }: { initial?: Subject; current: boolean; onSubmit: (b: Record<string, unknown>) => Promise<void>; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <form className="grid gap-3 sm:grid-cols-4" onSubmit={async (e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      setBusy(true);
      await onSubmit({
        name: String(f.get("name")), code: (f.get("code") as string) || null, credits: Number(f.get("credits")),
        marks_obtained: num(f.get("marks_obtained")), max_marks: Number(f.get("max_marks") || 100),
        classes_attended: Number(f.get("classes_attended") || 0), classes_total: Number(f.get("classes_total") || 0),
        difficulty: num(f.get("difficulty")),
      });
      setBusy(false);
    }}>
      <label className="sm:col-span-2"><span className="label">Subject name</span><input name="name" required maxLength={120} defaultValue={initial?.name} className="field" /></label>
      <label><span className="label">Code</span><input name="code" maxLength={30} defaultValue={initial?.code ?? ""} className="field" /></label>
      <label><span className="label">Credits</span><input name="credits" type="number" step="0.5" min={0} max={20} required defaultValue={initial?.credits ?? 3} className="field" /></label>
      <label><span className="label">Final marks {current && "(leave blank until results)"}</span><input name="marks_obtained" type="number" step="0.5" min={0} max={1000} defaultValue={initial?.marks_obtained ?? ""} className="field" /></label>
      <label><span className="label">Out of</span><input name="max_marks" type="number" min={1} max={1000} defaultValue={initial?.max_marks ?? 100} className="field" /></label>
      <label><span className="label">Classes attended</span><input name="classes_attended" type="number" min={0} max={1000} defaultValue={initial?.classes_attended ?? 0} className="field" /></label>
      <label><span className="label">Classes held</span><input name="classes_total" type="number" min={0} max={1000} defaultValue={initial?.classes_total ?? 0} className="field" /></label>
      <label><span className="label">How hard is it for you?</span>
        <select name="difficulty" defaultValue={initial?.difficulty ?? ""} className="field">
          <option value="">Not rated</option><option value="1">1, easy</option><option value="2">2</option><option value="3">3, okay</option><option value="4">4</option><option value="5">5, very hard</option>
        </select>
      </label>
      <div className="flex items-end gap-2 sm:col-span-3">
        <button className="btn btn-primary" disabled={busy}>{initial ? "Save subject" : "Add subject"}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function AssessmentForm({ onSubmit }: { onSubmit: (b: Record<string, unknown>) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <form className="grid gap-3 sm:grid-cols-6" onSubmit={async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const f = new FormData(form);
      setBusy(true);
      await onSubmit({ kind: f.get("kind"), title: (f.get("title") as string) || null, topic: (f.get("topic") as string) || null,
        score: Number(f.get("score")), max_score: Number(f.get("max_score")), taken_on: (f.get("taken_on") as string) || null });
      setBusy(false);
      form.reset();
    }}>
      <label><span className="label">Type</span>
        <select name="kind" className="field"><option value="quiz">Quiz</option><option value="assignment">Assignment</option><option value="midterm">Mid-term</option><option value="practical">Practical</option><option value="other">Other</option></select>
      </label>
      <label><span className="label">Title</span><input name="title" maxLength={120} className="field" placeholder="Quiz 2" /></label>
      <label><span className="label">Topic</span><input name="topic" maxLength={120} className="field" placeholder="Trees" /></label>
      <label><span className="label">Score</span><input name="score" type="number" step="0.5" min={0} required className="field" /></label>
      <label><span className="label">Out of</span><input name="max_score" type="number" step="0.5" min={0.5} required className="field" /></label>
      <label><span className="label">Date</span><input name="taken_on" type="date" className="field" /></label>
      <div className="sm:col-span-6"><button className="btn btn-soft" disabled={busy}><Plus className="size-4" />Add assessment</button></div>
    </form>
  );
}
