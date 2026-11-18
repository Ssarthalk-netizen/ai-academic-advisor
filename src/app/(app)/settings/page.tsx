"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { Notice, PageHeader, Section, Skeleton } from "@/components/ui";
import { Toggle } from "@/components/ui/Toggle";
import { InterestPicker } from "@/components/app/InterestPicker";
import { api, useApi } from "@/lib/client/api";

type Profile = {
  email: string; full_name: string | null; university: string | null; degree: string | null; branch: string | null; current_semester: number | null;
  admission_score: number | null; date_of_birth: string | null; scholarship_holder: boolean; fees_up_to_date: boolean; has_outstanding_dues: boolean;
  living_away_from_home: boolean; interests: string[]; learning_style: string | null; weekly_study_hours: number | null; attendance_threshold: number;
  target_cgpa: number | null; career_goal: string | null; ai_consent: boolean;
};

export default function Settings() {
  const router = useRouter();
  const { data, loading, reload } = useApi<{ data: Profile }>("/api/profile");
  const [p, setP] = useState<Profile | null>(null);
  const [msg, setMsg] = useState<{ tone: "info" | "critical"; text: string } | null>(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setP(data.data); }, [data]);
  if (loading || !p) return <Skeleton className="h-96" />;
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((s) => (s ? { ...s, [k]: v } : s));

  async function save(patch?: Partial<Profile>) {
    setBusy(true); setMsg(null);
    const src = { ...p!, ...patch };
    try {
      await api("/api/profile", { method: "PATCH", body: {
        full_name: src.full_name || null, university: src.university || null, degree: src.degree || null, branch: src.branch || null,
        current_semester: src.current_semester, admission_score: src.admission_score === null || (src.admission_score as unknown) === "" ? null : Number(src.admission_score),
        date_of_birth: src.date_of_birth || null, scholarship_holder: src.scholarship_holder, fees_up_to_date: src.fees_up_to_date,
        has_outstanding_dues: src.has_outstanding_dues, living_away_from_home: src.living_away_from_home, interests: src.interests,
        learning_style: src.learning_style, weekly_study_hours: src.weekly_study_hours === null ? null : Number(src.weekly_study_hours),
        attendance_threshold: Number(src.attendance_threshold), target_cgpa: src.target_cgpa === null || (src.target_cgpa as unknown) === "" ? null : Number(src.target_cgpa),
        career_goal: src.career_goal || null, ai_consent: src.ai_consent,
      } });
      setMsg({ tone: "info", text: "Settings saved." });
      reload();
    } catch (e) { setMsg({ tone: "critical", text: (e as Error).message }); } finally { setBusy(false); }
  }

  async function action(fn: () => Promise<unknown>, done: string) {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ tone: "info", text: done }); } catch (e) { setMsg({ tone: "critical", text: (e as Error).message }); } finally { setBusy(false); }
  }

  const input = (k: keyof Profile, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label><span className="label">{label}</span><input className="field" value={(p[k] as string | number | null) ?? ""} onChange={(e) => set(k, e.target.value as never)} {...props} /></label>
  );

  return (
    <div className="max-w-3xl space-y-10">
      <PageHeader title="Settings" intro={`Signed in as ${p.email}`} />
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <Section title="Profile">
        <div className="grid gap-4 sm:grid-cols-2">
          {input("full_name", "Name", { maxLength: 100 })}
          {input("university", "University", { maxLength: 150 })}
          {input("degree", "Degree", { maxLength: 100 })}
          {input("branch", "Branch", { maxLength: 100 })}
          <label><span className="label">Current semester</span>
            <select className="field" value={p.current_semester ?? 1} onChange={(e) => set("current_semester", Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>Semester {i + 1}</option>)}</select></label>
          {input("career_goal", "Career goal", { maxLength: 100 })}
        </div>
      </Section>

      <Section title="Study preferences">
        <div className="grid gap-4 sm:grid-cols-2">
          {input("weekly_study_hours", "Study hours per week", { type: "number", min: 0, max: 100 })}
          <label><span className="label">How you learn best</span>
            <select className="field" value={p.learning_style ?? "mixed"} onChange={(e) => set("learning_style", e.target.value)}>
              <option value="practice">Solving problems</option><option value="reading">Reading notes</option><option value="visual">Diagrams and visuals</option><option value="video">Videos</option><option value="mixed">A mix</option>
            </select></label>
          {input("attendance_threshold", "Minimum attendance rule (%)", { type: "number", min: 0, max: 100 })}
          {input("target_cgpa", "Target CGPA", { type: "number", step: "0.1", min: 0, max: 10 })}
        </div>
        <div className="mt-5"><span className="label">Interests</span><InterestPicker value={p.interests} onChange={(v) => set("interests", v)} /></div>
      </Section>

      <Section title="Details used by the risk model">
        <div className="grid gap-4 sm:grid-cols-2">
          {input("admission_score", "Admission / 12th score (%)", { type: "number", min: 0, max: 100 })}
          {input("date_of_birth", "Date of birth", { type: "date" })}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Toggle label="I have a scholarship" checked={p.scholarship_holder} onChange={(v) => set("scholarship_holder", v)} />
          <Toggle label="Fees paid up to date" checked={p.fees_up_to_date} onChange={(v) => set("fees_up_to_date", v)} />
          <Toggle label="Outstanding dues" checked={p.has_outstanding_dues} onChange={(v) => set("has_outstanding_dues", v)} />
          <Toggle label="Living away from home" checked={p.living_away_from_home} onChange={(v) => set("living_away_from_home", v)} />
        </div>
      </Section>

      <button className="btn btn-primary" disabled={busy} onClick={() => save()}>Save settings</button>

      <Section title="Privacy">
        <div className="space-y-4">
          <div className="card-butter p-5">
            <Toggle label="AI features (Gemini)" checked={p.ai_consent} onChange={(v) => { set("ai_consent", v); save({ ai_consent: v }); }} />
            <p className="mt-2 text-[13.5px] text-ink-soft">When on, a summary of your academic records (no name, email or date of birth) is sent to Google&apos;s Gemini API to answer you. Read the <Link href="/privacy" className="underline">privacy policy</Link>.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/api/account/export" className="btn btn-soft"><Download className="size-4" />Download my data</a>
            <button className="btn btn-soft" disabled={busy} onClick={() => window.confirm("Replace your records with the sample student?") && action(() => api("/api/demo", { method: "POST" }), "Sample student loaded.")}>Load sample student</button>
            <button className="btn btn-danger" disabled={busy} onClick={() => window.confirm("Delete all your academic records? Your account stays.") && action(() => api("/api/demo", { method: "DELETE" }), "All records cleared.")}><Trash2 className="size-4" />Clear all records</button>
          </div>
        </div>
      </Section>

      <Section title="Delete account">
        <div className="rounded-[16px] border border-[#f7c2bb] bg-alarm-soft/50 p-5">
          <p className="text-[14px]">This permanently deletes your account, every record, chat message and uploaded file. It can&apos;t be undone.</p>
          <label className="mt-3 block"><span className="label">Type DELETE to confirm</span><input className="field max-w-xs" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
          <button className="btn btn-danger mt-3" disabled={busy || confirm !== "DELETE"}
            onClick={() => action(async () => { await api("/api/account", { method: "DELETE", body: { confirm: "DELETE" } }); router.replace("/"); router.refresh(); }, "Account deleted.")}>
            Delete my account
          </button>
        </div>
      </Section>
    </div>
  );
}
