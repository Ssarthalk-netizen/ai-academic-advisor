"use client";
import Link from "next/link";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Notice, PageHeader, Section, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/client/api";
import { fmtDate, type Overview } from "@/lib/client/types";
import { interventions } from "@/lib/academics/interventions";

const fmt = (feature: string, v: number) =>
  feature.includes("pass_rate") ? `${Math.round(v * 100)}%` :
  ["scholarship_holder", "debtor", "tuition_up_to_date", "displaced"].includes(feature) ? (v ? "yes" : "no") :
  String(Math.round(v * 100) / 100);

export default function RiskPage() {
  const { data, error, loading } = useApi<Overview>("/api/overview");
  if (loading && !data) return <Skeleton className="h-96" />;
  if (error) return <Notice tone="critical">{error}</Notice>;
  if (!data) return null;
  const risk = data.insights.wrong.risk;
  const alerts = data.insights.wrong.alerts;
  const pct = risk ? Math.round(risk.probability * 100) : 0;

  return (
    <div className="space-y-10">
      <PageHeader title="Risk radar" intro="Two views side by side: a machine-learning estimate of overall academic risk, and specific warnings worked out from your records with simple, visible rules." />

      {risk ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <div className="self-start rounded-[18px] bg-ink p-7 text-[#fff8e6]">
            <div className="text-[13px] font-semibold text-[#e9d3b5]">Estimated risk of falling behind</div>
            <div className={`numeral mt-3 text-[64px] ${risk.level === "High" ? "text-[#ff9c8a]" : risk.level === "Medium" ? "text-butter" : "text-[#9be3b4]"}`}>{risk.level}</div>
            <Gauge value={pct} />
            <p className="mt-5 text-[13.5px] text-[#e9d3b5]">
              {risk.model} trained on 4,424 university students. Below 30% is low, 30–60% medium, above 60% high.
              It&apos;s an estimate to help you plan, not a judgement.
            </p>
          </div>

          <div>
            <h2 className="text-[17px] font-semibold">Why the model thinks so</h2>
            <p className="mt-1 text-[14px] text-ink-soft">Factors where you differ from a typical student who completed their degree, ordered by how much the model relies on them.</p>
            {risk.factors.length ? (
              <table className="mt-4 w-full text-[14px]">
                <thead className="text-left text-[12.5px] text-ink-soft"><tr><th className="pb-2 font-semibold">Factor</th><th className="pb-2 font-semibold">You</th><th className="pb-2 font-semibold">Typical</th><th className="pb-2 font-semibold">Model weight</th></tr></thead>
                <tbody>
                  {risk.factors.map((f) => (
                    <tr key={f.feature} className="border-t border-line">
                      <td className="py-2.5">{f.label}</td>
                      <td className="py-2.5 font-semibold text-ember">{fmt(f.feature, f.value)}</td>
                      <td className="py-2.5 text-ink-soft">{fmt(f.feature, f.typical)}</td>
                      <td className="py-2.5"><div className="h-1.5 w-24 rounded-full bg-butter-soft"><div className="h-full rounded-full bg-ink" style={{ width: `${Math.min(100, f.weight * 400)}%` }} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="mt-4 text-leaf">You&apos;re at or better than the typical completing student on every factor.</p>}

            <h3 className="mt-7 font-semibold">What would help</h3>
            <ul className="mt-2 space-y-2">
              {interventions(risk.factors.map((f) => f.feature), risk.level).map((t) => <li key={t} className="flex gap-2 text-[14px]"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-ember" />{t}</li>)}
            </ul>
            {risk.assumptions.length > 0 && (
              <div className="mt-6"><Notice tone="info" title="Assumptions in this estimate">
                <ul className="mt-1 list-disc pl-4">{risk.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
                <Link href="/settings" className="mt-1 inline-block font-semibold underline">Fill in missing details</Link>
              </Notice></div>
            )}
          </div>
        </div>
      ) : (
        <Notice tone="info" title="No estimate yet">Add marks for at least one semester (or assessment scores for the current one) in <Link href="/academics" className="underline">My records</Link>.</Notice>
      )}

      {data.riskHistory.length > 1 && (
        <Section title="Is it improving?">
          <div className="card h-56 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.riskHistory.map((h) => ({ date: fmtDate(h.created_at), risk: Math.round(h.probability * 100) }))} margin={{ left: -20, right: 10, top: 10 }}>
                <CartesianGrid stroke="#efe3c4" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6b4a3a" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "#a58c7c" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #efe3c4", fontSize: 13 }} formatter={(v) => [`${v}%`, "Risk"]} />
                <Line type="monotone" dataKey="risk" stroke="#e0600c" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      <Section title={`Warnings from your records (${alerts.length})`}>
        <div className="space-y-3">
          {alerts.map((a) => (
            <div key={a.id} className="grid gap-3 rounded-[16px] border border-line bg-white p-4 sm:grid-cols-[auto_1fr_1fr]">
              <Badge tone={a.severity === "critical" ? "alarm" : a.severity === "warning" ? "ember" : "butter"}>{a.severity}</Badge>
              <div><div className="font-semibold">{a.title}</div><div className="mt-0.5 text-[13.5px] text-ink-soft">{a.evidence}</div></div>
              <div className="text-[13.5px]"><span className="font-semibold">Do this: </span>{a.action}</div>
            </div>
          ))}
          {alerts.length === 0 && <p className="text-ink-soft">No warnings right now.</p>}
        </div>
      </Section>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  return (
    <div className="mt-5" aria-label={`Risk probability ${value}%`}>
      <div className="relative h-3 rounded-full bg-gradient-to-r from-[#5fbf86] via-[#f5c04a] to-[#e2563f]">
        <div className="absolute -top-1.5 size-6 -translate-x-1/2 rounded-full border-4 border-ink bg-[#fff8e6]" style={{ left: `${value}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[12px] text-[#cdb59e]"><span>0%</span><span className="numeral text-[22px] text-[#fff8e6]">{value}%</span><span>100%</span></div>
    </div>
  );
}
