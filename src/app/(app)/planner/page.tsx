"use client";
import { useMemo, useState } from "react";
import { Check, RotateCcw, Sparkles, X } from "lucide-react";
import { Badge, Empty, Notice, PageHeader, ProgressBar, Section, Skeleton } from "@/components/ui";
import { api, useApi } from "@/lib/client/api";
import type { Overview } from "@/lib/client/types";

type Session = { id: string; subject_id: string | null; topic: string | null; planned_date: string; planned_minutes: number; actual_minutes: number | null; status: string; source: string };
type Subject = { id: string; name: string };

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 864e5);
const hours = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`);

export default function Planner() {
  const sessions = useApi<{ data: Session[] }>("/api/records/study_sessions");
  const subjects = useApi<{ data: Subject[] }>("/api/records/subjects");
  const ov = useApi<Overview>("/api/overview");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "info" | "warning" | "critical"; text: string } | null>(null);
  const [minutes, setMinutes] = useState<number | "">("");

  const name = useMemo(() => new Map((subjects.data?.data ?? []).map((s) => [s.id, s.name])), [subjects.data]);
  const all = sessions.data?.data ?? [];
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => ymd(addDays(today, i)));
  const weekAgo = ymd(addDays(today, -7));
  const past = all.filter((s) => s.planned_date >= weekAgo && s.planned_date < ymd(today));
  const planned = past.reduce((a, s) => a + s.planned_minutes, 0);
  const done = past.filter((s) => s.status === "done").reduce((a, s) => a + (s.actual_minutes ?? s.planned_minutes), 0);

  async function act(fn: () => Promise<{ message?: string } | unknown>, success?: string) {
    setBusy(true); setMsg(null);
    try {
      const r = (await fn()) as { message?: string; overflowMinutes?: number };
      if (r && typeof r === "object" && "message" in r && r.message) setMsg({ tone: r.overflowMinutes ? "warning" : "info", text: r.message });
      else if (success) setMsg({ tone: "info", text: success });
      sessions.reload();
    } catch (e) { setMsg({ tone: "critical", text: (e as Error).message }); } finally { setBusy(false); }
  }

  const mark = (s: Session, status: "done" | "missed" | "planned") =>
    act(() => api(`/api/records/study_sessions/${s.id}`, { method: "PATCH", body: { status, actual_minutes: status === "done" ? s.planned_minutes : null } }));

  if (sessions.loading && !sessions.data) return <Skeleton className="h-96" />;
  const priorities = ov.data?.insights.todo.priorities ?? [];

  return (
    <div className="space-y-10">
      <PageHeader title="Study planner"
        intro="Your week is built from weak subjects, difficulty and exam dates. Missed a session? Recover it and the time is spread over days that still have room."
        actions={<>
          <label className="flex items-center gap-2 text-[13px] text-ink-soft">Minutes a day
            <input type="number" min={30} max={480} step={15} value={minutes} placeholder="auto" onChange={(e) => setMinutes(e.target.value ? Number(e.target.value) : "")} className="field w-24 py-2" />
          </label>
          <button className="btn btn-soft" disabled={busy} onClick={() => act(() => api("/api/planner/reschedule", { method: "POST" }))}><RotateCcw className="size-4" />Recover missed sessions</button>
          <button className="btn btn-primary" disabled={busy} onClick={() => act(() => api("/api/planner", { body: minutes ? { minutes_per_day: minutes } : {} }), "Plan ready for the next 7 days.")}><Sparkles className="size-4" />Make this week&apos;s plan</button>
        </>} />
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <div className="grid gap-8 lg:grid-cols-[1fr_2.2fr]">
        <div className="space-y-8">
          <Section title="Why this order">
            <ol className="space-y-2.5">
              {priorities.map((p, i) => (
                <li key={p.subject_id} className="rounded-[14px] border border-line bg-white p-3">
                  <div className="flex items-baseline justify-between"><span className="font-semibold">{i + 1}. {p.subject}</span><span className="text-[12px] text-ink-faint">priority {p.score}</span></div>
                  {p.reasons.length > 0 && <div className="mt-0.5 text-[13px] text-ink-soft">{p.reasons.join(", ")}</div>}
                </li>
              ))}
              {priorities.length === 0 && <li className="text-[14px] text-ink-soft">Add current-semester subjects to see priorities.</li>}
            </ol>
          </Section>
          <Section title="Reality check, last 7 days">
            <div className="card p-4">
              {planned > 0 ? (
                <>
                  <div className="flex items-baseline justify-between"><span className="numeral text-[30px]">{Math.round((done / planned) * 100)}%</span><span className="text-[13px] text-ink-soft">{hours(done)} of {hours(planned)} done</span></div>
                  <div className="mt-3"><ProgressBar value={(done / planned) * 100} tone={done / planned < 0.6 ? "ember" : "leaf"} /></div>
                  {done / planned < 0.6 && <p className="mt-3 text-[13.5px] text-ink-soft">You&apos;re completing less than you plan. Set fewer minutes a day so the plan matches real life.</p>}
                </>
              ) : <p className="text-[14px] text-ink-soft">No sessions last week yet.</p>}
            </div>
          </Section>
        </div>

        <Section title="Next 7 days">
          {all.filter((s) => days.includes(s.planned_date)).length === 0 ? (
            <Empty title="No plan yet" action={<button className="btn btn-primary" disabled={busy} onClick={() => act(() => api("/api/planner", { body: {} }), "Plan ready for the next 7 days.")}>Make this week&apos;s plan</button>}>
              The planner uses your weekly study hours from Settings and your current subjects.
            </Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {days.map((d, i) => {
                const list = all.filter((s) => s.planned_date === d);
                const date = new Date(d);
                return (
                  <div key={d} className={`rounded-[16px] border p-3 ${i === 0 ? "border-ink bg-butter-soft/50" : "border-line bg-white"}`}>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="font-semibold">{i === 0 ? "Today" : date.toLocaleDateString("en-IN", { weekday: "long" })}</span>
                      <span className="text-[12px] text-ink-faint">{date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    </div>
                    <ul className="space-y-2">
                      {list.map((s) => (
                        <li key={s.id} className={`rounded-[12px] p-2.5 text-[13.5px] ${s.status === "done" ? "bg-leaf-soft" : s.status === "missed" ? "bg-alarm-soft" : "bg-[#fffaf0] ring-1 ring-line"}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold leading-snug">{s.subject_id ? name.get(s.subject_id) ?? "Study" : "Study"}</div>
                              <div className="text-[12.5px] text-ink-soft">{hours(s.planned_minutes)}{s.topic ? `, ${s.topic}` : ""}</div>
                            </div>
                            {s.source === "recovery" && <Badge tone="ember">recovery</Badge>}
                          </div>
                          {s.status === "planned" ? (
                            <div className="mt-2 flex gap-1.5">
                              <button className="btn btn-soft px-2 py-1 text-[12.5px]" onClick={() => mark(s, "done")}><Check className="size-3.5" />Done</button>
                              <button className="btn btn-ghost px-2 py-1 text-[12.5px]" onClick={() => mark(s, "missed")}><X className="size-3.5" />Missed</button>
                            </div>
                          ) : (
                            <button className="mt-1.5 text-[12px] text-ink-soft underline" onClick={() => mark(s, "planned")}>{s.status === "done" ? "Completed" : "Missed"}, undo</button>
                          )}
                        </li>
                      ))}
                      {list.length === 0 && <li className="text-[13px] text-ink-faint">Free</li>}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
