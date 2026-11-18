"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo, Notice } from "@/components/ui";
import { InterestPicker } from "@/components/app/InterestPicker";
import { Toggle } from "@/components/ui/Toggle";
import { api } from "@/lib/client/api";

type Form = {
  full_name: string; university: string; degree: string; branch: string; current_semester: number;
  weekly_study_hours: number; learning_style: string; attendance_threshold: number; target_cgpa: string;
  career_goal: string; interests: string[];
  admission_score: string; date_of_birth: string; scholarship_holder: boolean; fees_up_to_date: boolean;
  has_outstanding_dues: boolean; living_away_from_home: boolean; ai_consent: boolean;
};

const STEPS = ["About you", "How you study", "Optional details", "Privacy"];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<Form>({
    full_name: "", university: "", degree: "B.Tech", branch: "", current_semester: 1,
    weekly_study_hours: 14, learning_style: "mixed", attendance_threshold: 75, target_cgpa: "",
    career_goal: "", interests: [], admission_score: "", date_of_birth: "",
    scholarship_holder: false, fees_up_to_date: true, has_outstanding_dues: false, living_away_from_home: false, ai_consent: false,
  });
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));

  async function finish(withSample: boolean) {
    setBusy(true); setError(null);
    try {
      await api("/api/profile", { method: "PATCH", body: {
        full_name: f.full_name || null, university: f.university || null, degree: f.degree || null, branch: f.branch || null,
        current_semester: f.current_semester, weekly_study_hours: f.weekly_study_hours, learning_style: f.learning_style,
        attendance_threshold: f.attendance_threshold, target_cgpa: f.target_cgpa ? Number(f.target_cgpa) : null,
        career_goal: f.career_goal || null, interests: f.interests,
        admission_score: f.admission_score ? Number(f.admission_score) : null, date_of_birth: f.date_of_birth || null,
        scholarship_holder: f.scholarship_holder, fees_up_to_date: f.fees_up_to_date,
        has_outstanding_dues: f.has_outstanding_dues, living_away_from_home: f.living_away_from_home,
        ai_consent: f.ai_consent, onboarded: true,
      } });
      if (withSample) await api("/api/demo", { method: "POST" });
      router.replace(withSample ? "/dashboard" : "/academics");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <div className="sheet p-6 sm:p-10">
      <Logo href="/" />
      <ol className="mt-8 flex flex-wrap gap-2 text-[13px]" aria-label="Setup steps">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined}
            className={`rounded-full px-3 py-1 font-medium ${i === step ? "bg-ink text-[#fff8e6]" : i < step ? "bg-butter text-ink" : "bg-butter-soft text-ink-faint"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <div className="mt-8">
        {step === 0 && (
          <Step title="Tell us about your course" intro="This sets up your dashboard. You can change everything later in Settings.">
            <Grid>
              <Field label="Your name"><input className="field" value={f.full_name} maxLength={100} onChange={(e) => set("full_name", e.target.value)} /></Field>
              <Field label="University"><input className="field" value={f.university} maxLength={150} onChange={(e) => set("university", e.target.value)} placeholder="e.g. Ajeenkya D Y Patil University" /></Field>
              <Field label="Degree"><input className="field" value={f.degree} maxLength={100} onChange={(e) => set("degree", e.target.value)} /></Field>
              <Field label="Branch / specialisation"><input className="field" value={f.branch} maxLength={100} onChange={(e) => set("branch", e.target.value)} placeholder="e.g. Computer Science (AI & ML)" /></Field>
              <Field label="Current semester">
                <select className="field" value={f.current_semester} onChange={(e) => set("current_semester", Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Semester {i + 1}</option>)}
                </select>
              </Field>
            </Grid>
          </Step>
        )}
        {step === 1 && (
          <Step title="How do you study?" intro="Used by the study planner and recommendations.">
            <Grid>
              <Field label="Hours you can study per week"><input type="number" min={0} max={100} className="field" value={f.weekly_study_hours} onChange={(e) => set("weekly_study_hours", Number(e.target.value))} /></Field>
              <Field label="How you learn best">
                <select className="field" value={f.learning_style} onChange={(e) => set("learning_style", e.target.value)}>
                  <option value="practice">Solving problems</option><option value="reading">Reading notes</option>
                  <option value="visual">Diagrams and visuals</option><option value="video">Videos</option><option value="mixed">A mix</option>
                </select>
              </Field>
              <Field label="Minimum attendance rule (%)"><input type="number" min={0} max={100} className="field" value={f.attendance_threshold} onChange={(e) => set("attendance_threshold", Number(e.target.value))} /></Field>
              <Field label="Target CGPA (optional)"><input type="number" step="0.1" min={0} max={10} className="field" value={f.target_cgpa} onChange={(e) => set("target_cgpa", e.target.value)} placeholder="e.g. 8.0" /></Field>
              <Field label="Career goal (optional)"><input className="field" value={f.career_goal} maxLength={100} onChange={(e) => set("career_goal", e.target.value)} placeholder="e.g. Machine learning engineer" /></Field>
            </Grid>
            <div className="mt-6"><span className="label">Interests</span><InterestPicker value={f.interests} onChange={(v) => set("interests", v)} /></div>
          </Step>
        )}
        {step === 2 && (
          <Step title="A few optional details" intro="The risk model was trained with these factors. Leave any blank and it uses the dataset's typical value, and tells you it did.">
            <Grid>
              <Field label="12th / admission score (%)"><input type="number" min={0} max={100} className="field" value={f.admission_score} onChange={(e) => set("admission_score", e.target.value)} /></Field>
              <Field label="Date of birth"><input type="date" className="field" value={f.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} /></Field>
            </Grid>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Toggle label="I have a scholarship" checked={f.scholarship_holder} onChange={(v) => set("scholarship_holder", v)} />
              <Toggle label="My fees are paid up to date" checked={f.fees_up_to_date} onChange={(v) => set("fees_up_to_date", v)} />
              <Toggle label="I have outstanding dues" checked={f.has_outstanding_dues} onChange={(v) => set("has_outstanding_dues", v)} />
              <Toggle label="I live away from home (hostel / PG)" checked={f.living_away_from_home} onChange={(v) => set("living_away_from_home", v)} />
            </div>
          </Step>
        )}
        {step === 3 && (
          <Step title="Your privacy" intro="Your records are only visible to you. AI features are optional.">
            <div className="card-butter p-5">
              <Toggle label="Turn on AI features (chat, explanations, roadmaps, weekly report)" checked={f.ai_consent} onChange={(v) => set("ai_consent", v)} />
              <p className="mt-3 text-[13.5px] text-ink-soft">
                When on, a summary of your academic records (no name, email or date of birth) is sent to Google&apos;s Gemini API to generate answers.
                Risk estimates, CGPA maths, Risk Radar and the study planner work without it. You can change this any time.
              </p>
            </div>
            {error && <div className="mt-4"><Notice tone="critical">{error}</Notice></div>}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button className="btn btn-primary py-3" disabled={busy} onClick={() => finish(false)}>Add my own subjects</button>
              <button className="btn btn-soft py-3" disabled={busy} onClick={() => finish(true)}>Explore with a sample student</button>
            </div>
            <p className="mt-3 text-[12.5px] text-ink-faint">The sample student fills your account with example records. You can clear them later in Settings.</p>
          </Step>
        )}
      </div>

      <div className="mt-10 flex justify-between">
        <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</button>
        {step < 3 && <button className="btn btn-primary" onClick={() => setStep((s) => s + 1)}>Continue</button>}
      </div>
    </div>
  );
}

function Step({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return <section><h1 className="display text-[30px] sm:text-[36px]">{title}</h1><p className="mb-6 mt-2 text-ink-soft">{intro}</p>{children}</section>;
}
function Grid({ children }: { children: React.ReactNode }) { return <div className="grid gap-4 sm:grid-cols-2">{children}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="label">{label}</span>{children}</label>; }
