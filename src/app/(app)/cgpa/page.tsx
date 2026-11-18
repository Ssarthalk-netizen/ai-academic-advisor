"use client";
import { useEffect, useMemo, useState } from "react";
import { Badge, Empty, Notice, PageHeader, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/client/api";
import { GRADE_SCALE, gradeFor, requiredForTarget, whatIf } from "@/lib/academics/grading";
import type { Overview } from "@/lib/client/types";

type Semester = { id: string; number: number; is_current: boolean };
type Subject = { id: string; semester_id: string; name: string; credits: number; marks_obtained: number | null; max_marks: number };

export default function CgpaPage() {
  const ov = useApi<Overview>("/api/overview");
  const sems = useApi<{ data: Semester[] }>("/api/records/semesters");
  const subs = useApi<{ data: Subject[] }>("/api/records/subjects");
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [target, setTarget] = useState(8);
  const [scope, setScope] = useState<"semester" | "degree">("semester");
  const [totalSems, setTotalSems] = useState(8);

  const { done, current, avgCredits, semNo } = useMemo(() => {
    const s = sems.data?.data ?? [];
    const cur = new Set(s.filter((x) => x.is_current).map((x) => x.id));
    const all = subs.data?.data ?? [];
    const finished = all.filter((x) => !cur.has(x.semester_id) && x.marks_obtained !== null)
      .map((x) => ({ credits: Number(x.credits), percent: (Number(x.marks_obtained) / Number(x.max_marks)) * 100 }));
    const currentSubs = all.filter((x) => cur.has(x.semester_id));
    const semCredits = s.filter((x) => !cur.has(x.id)).map((x) => all.filter((y) => y.semester_id === x.id).reduce((a, b) => a + Number(b.credits), 0));
    return {
      done: finished, current: currentSubs,
      avgCredits: semCredits.length ? semCredits.reduce((a, b) => a + b, 0) / semCredits.length : currentSubs.reduce((a, b) => a + Number(b.credits), 0) || 20,
      semNo: s.find((x) => x.is_current)?.number ?? s.length,
    };
  }, [sems.data, subs.data]);

  // default sliders: current provisional % (from assessments) or 70
  useEffect(() => {
    if (!ov.data || !current.length) return;
    const prov = new Map(ov.data.insights.currentSubjects.map((s) => [s.id, s.percent]));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialise sliders from loaded data once
    setMarks((m) => Object.keys(m).length ? m : Object.fromEntries(current.map((s) => [s.id, Math.round(prov.get(s.id) ?? 70)])));
    if (ov.data.profile.target_cgpa) setTarget(Number(ov.data.profile.target_cgpa));
  }, [ov.data, current]);

  if ((sems.loading && !sems.data) || (subs.loading && !subs.data)) return <Skeleton className="h-96" />;
  if (!current.length) return (<div><PageHeader title="CGPA simulator" /><Empty title="Mark a semester as current and add its subjects first">The simulator needs this semester&apos;s subjects and credits to project your CGPA.</Empty></div>);

  const hypo = current.map((s) => ({ credits: Number(s.credits), percent: marks[s.id] ?? 70 }));
  const sim = whatIf(done, hypo);
  const currentCredits = current.reduce((a, b) => a + Number(b.credits), 0);
  const remaining = scope === "semester" ? currentCredits : currentCredits + Math.max(0, totalSems - semNo) * avgCredits;
  const need = requiredForTarget(done, Math.round(remaining), target);

  return (
    <div className="space-y-10">
      <PageHeader title="CGPA simulator" intro="Move the sliders to see what this semester could do to your CGPA. All maths is done with a fixed grading scale, not AI." />

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="text-[17px] font-semibold">What if I score…</h2>
          <ul className="mt-4 space-y-4">
            {current.map((s) => {
              const v = marks[s.id] ?? 70;
              const g = gradeFor(v);
              return (
                <li key={s.id} className="rounded-[16px] border border-line bg-white p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <label htmlFor={`m-${s.id}`} className="font-medium">{s.name} <span className="text-[12.5px] font-normal text-ink-faint">{Number(s.credits)} credits</span></label>
                    <span className="flex items-baseline gap-2"><span className="numeral text-[22px]">{v}%</span><Badge tone={g.points === 0 ? "alarm" : g.points >= 9 ? "leaf" : "butter"}>{g.grade}</Badge></span>
                  </div>
                  <input id={`m-${s.id}`} type="range" min={0} max={100} value={v} onChange={(e) => setMarks((m) => ({ ...m, [s.id]: Number(e.target.value) }))}
                    className="mt-3 w-full accent-[#3a1607]" />
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-6">
          <div className="card-butter sticky top-6 p-6">
            <div className="grid grid-cols-2 gap-4">
              <div><div className="text-[13px] font-semibold text-ink-soft">This semester (SGPA)</div><div className="numeral mt-2 text-[48px]">{sim.projectedSgpa?.toFixed(2) ?? "–"}</div></div>
              <div><div className="text-[13px] font-semibold text-ink-soft">New CGPA</div><div className="numeral mt-2 text-[48px]">{sim.projectedCgpa?.toFixed(2) ?? "–"}</div></div>
            </div>
            {sim.change !== null && <p className="mt-3 text-[14px]">From <strong>{sim.currentCgpa?.toFixed(2)}</strong>, that&apos;s <strong className={sim.change >= 0 ? "text-leaf" : "text-alarm"}>{sim.change >= 0 ? "+" : ""}{sim.change}</strong>.</p>}
            {hypo.some((h) => h.percent < 40) && <div className="mt-4"><Notice tone="critical">A subject below 40% is a fail (0 grade points) and needs a re-exam.</Notice></div>}
          </div>

          <div className="card p-6">
            <h2 className="text-[17px] font-semibold">What do I need for my target?</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label><span className="label">Target CGPA</span><input type="number" step="0.1" min={0} max={10} value={target} onChange={(e) => setTarget(Number(e.target.value))} className="field" /></label>
              <label><span className="label">By</span>
                <select value={scope} onChange={(e) => setScope(e.target.value as "semester" | "degree")} className="field">
                  <option value="semester">End of this semester</option><option value="degree">Graduation</option>
                </select>
              </label>
              {scope === "degree" && <label className="col-span-2"><span className="label">Total semesters in your degree</span><input type="number" min={semNo} max={12} value={totalSems} onChange={(e) => setTotalSems(Number(e.target.value))} className="field" /></label>}
            </div>
            <div className="mt-5">
              {need.feasible ? (
                <>
                  <div className="text-[13px] font-semibold text-ink-soft">SGPA needed on average</div>
                  <div className="numeral mt-1 text-[40px]">{need.requiredSgpa?.toFixed(2)}</div>
                  <p className="mt-2 text-[14px] text-ink-soft">{need.reason}{need.minAveragePercent !== null && need.minAveragePercent !== undefined && (need.requiredSgpa ?? 0) > 0 ? ` That means about ${need.minAveragePercent}% or more in most subjects.` : ""}</p>
                </>
              ) : <Notice tone="warning" title="Not reachable in this time">{need.reason}</Notice>}
            </div>
          </div>

          <details className="text-[13px] text-ink-soft">
            <summary className="cursor-pointer font-semibold">Grading scale used</summary>
            <table className="mt-2 w-full"><tbody>{GRADE_SCALE.map((g, i) => <tr key={g.grade} className="border-t border-line"><td className="py-1">{g.grade}</td><td>{g.points} points</td><td>{i === 0 ? `${g.min}% and above` : `${g.min}% to ${GRADE_SCALE[i - 1].min - 1}%`}</td></tr>)}</tbody></table>
            <p className="mt-2">This is the common UGC 10-point scale. Check your university&apos;s exact bands.</p>
          </details>
        </div>
      </div>
    </div>
  );
}
