import Link from "next/link";
import { CalendarClock, Compass, Gauge, MessageCircleQuestion, Radar, ShieldCheck } from "lucide-react";
import { PublicShell } from "@/components/PublicNav";

export default function Landing() {
  return (
    <PublicShell>
      {/* Hero: the report card is the one bold element on the page */}
      <section className="grid items-center gap-12 px-5 pb-16 pt-14 sm:px-10 lg:grid-cols-[1.2fr_1fr] lg:pt-20">
        <div>
          <h1 className="display text-[44px] sm:text-[56px] lg:text-[62px]">
            Know where you stand before results day
          </h1>
          <p className="mt-6 max-w-[34rem] text-[17px] text-ink-soft">
            Add your marks, attendance and deadlines. The advisor spots what&apos;s slipping, shows what your CGPA
            could become, plans your week, and answers questions using your own records.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn btn-primary px-5 py-3 text-[15px]">Create a free account</Link>
            <Link href="/#how-it-works" className="btn btn-soft px-5 py-3 text-[15px]">See how it works</Link>
          </div>
          <p className="mt-4 text-[13px] text-ink-faint">You can load a sample student after signing up to explore every feature.</p>
        </div>

        <ReportCard />
      </section>

      {/* Five questions */}
      <section id="features" className="border-t border-line px-5 py-16 sm:px-10">
        <h2 className="display max-w-3xl text-[34px] sm:text-[42px]">Five questions, answered every time you open it</h2>
        <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          <Feature icon={Gauge} title="Where am I?" body="CGPA, SGPA per semester, credits and attendance in one place, calculated with your university's grading scale." />
          <Feature icon={Radar} title="What's going wrong?" body="Risk Radar flags low attendance, falling marks, weak topics and close deadlines, each with the evidence behind it." />
          <Feature icon={CalendarClock} title="What should I do next?" body="An adaptive study plan built around your weak subjects and exam dates. Missed a session? It spreads the work out instead of piling it on tomorrow." />
          <Feature icon={MessageCircleQuestion} title="Can someone explain this?" body="Ask the AI advisor anything about your studies. It answers from your records, and can explain a topic simply, with an example, or exam-style." />
          <Feature icon={Compass} title="Where am I heading?" body="Career pathways matched to your interests and subjects, the skills you still need, and a 12-week roadmap." />
          <Feature icon={ShieldCheck} title="Is my data safe?" body="Only you can see your records. AI features are opt-in, and you can export or delete everything at any time." />
        </div>
      </section>

      {/* The one dark section */}
      <section id="how-it-works" className="mx-3 rounded-[24px] bg-night px-6 py-16 text-[#fbeedb] sm:mx-6 sm:px-12">
        <h2 className="display max-w-3xl text-[34px] text-[#fff3d6] sm:text-[42px]">How the advisor thinks</h2>
        <p className="mt-4 max-w-2xl text-[#d9c3ad]">
          Machine learning does the predicting. Generative AI only explains. Every number you see comes from your data
          and deterministic code, never from a language model guessing.
        </p>
        <ol className="mt-12 grid gap-8 md:grid-cols-4">
          {[
            ["Your records", "Marks, assessments, attendance, deadlines and exams you enter or load as sample data."],
            ["Feature store", "Records become features: pass rates, SGPA trend, fee status, attendance margins."],
            ["ML models", "A Random Forest trained on 4,424 university students estimates academic risk. A text classifier routes your questions."],
            ["Explanations", "Gemini turns the results into plain-language advice, always labelled as AI and grounded in your numbers."],
          ].map(([t, b], i) => (
            <li key={t} className="border-t border-[#5a3a28] pt-5">
              <span className="numeral text-[28px] text-butter">{i + 1}</span>
              <h3 className="mt-3 font-semibold text-[#fff3d6]">{t}</h3>
              <p className="mt-1.5 text-[14px] text-[#cdb59e]">{b}</p>
            </li>
          ))}
        </ol>
        <dl className="mt-14 grid gap-6 border-t border-[#5a3a28] pt-8 sm:grid-cols-3">
          <div><dt className="text-[13px] text-[#cdb59e]">Risk model accuracy on unseen students</dt><dd className="numeral mt-2 text-[44px] text-[#fff3d6]">87.5%</dd></div>
          <div><dt className="text-[13px] text-[#cdb59e]">At-risk students correctly caught (recall)</dt><dd className="numeral mt-2 text-[44px] text-[#fff3d6]">82%</dd></div>
          <div><dt className="text-[13px] text-[#cdb59e]">Courses in the recommendation catalog</dt><dd className="numeral mt-2 text-[44px] text-[#fff3d6]">3,720</dd></div>
        </dl>
      </section>

      <section className="px-5 pb-4 pt-16 text-center sm:px-10">
        <h2 className="display mx-auto max-w-2xl text-[34px] sm:text-[42px]">Start with this semester</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-soft">It takes about five minutes to add your current subjects. Or load a sample student and look around first.</p>
        <Link href="/signup" className="btn btn-primary mt-7 px-6 py-3 text-[15px]">Create a free account</Link>
      </section>
    </PublicShell>
  );
}

function Feature({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <div>
      <div className="flex size-10 items-center justify-center rounded-[12px] bg-butter-soft">
        <Icon className="size-5 text-ink" />
      </div>
      <h3 className="mt-4 text-[17px] font-semibold">{title}</h3>
      <p className="mt-1.5 text-[14.5px] text-ink-soft">{body}</p>
    </div>
  );
}

/** Floating "report card" with sample numbers (borrowed from the Enquire stat-card style). */
function ReportCard() {
  const sgpa = [7.81, 7.31, 7.02];
  return (
    <div className="relative mx-auto w-full max-w-[460px] pb-24 pt-6" aria-label="Example dashboard for a sample student">
      <div className="card-butter relative z-0 rotate-[-1.5deg] p-6 shadow-[0_30px_60px_-30px_rgba(120,70,0,.45)]">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-semibold text-ink-soft">Sample student, Semester 3</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-faint">sample</span>
        </div>
        <div className="mt-5 flex items-end gap-6">
          <div>
            <div className="numeral text-[72px]">7.56</div>
            <div className="mt-1 text-[13px] text-ink-soft">CGPA after 2 semesters</div>
          </div>
          <div className="mb-2 flex h-28 flex-1 items-end justify-end gap-4" aria-hidden>
            {sgpa.map((v, i) => (
              <div key={i} className="flex w-9 flex-col items-center gap-1.5">
                <div className={`w-full rounded-t-[8px] ${i === 2 ? "bg-ember" : "bg-ink"}`} style={{ height: `${v * 10}px` }} />
                <span className="text-[11px] text-ink-faint">S{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 text-[13px]">
          <div className="rounded-[12px] bg-white p-3"><div className="numeral text-[24px]">5</div><div className="text-ink-soft">subjects this semester</div></div>
          <div className="rounded-[12px] bg-white p-3"><div className="numeral text-[24px]">12 days</div><div className="text-ink-soft">to the first end-term</div></div>
        </div>
      </div>

      <div className="absolute -right-2 top-0 z-10 rotate-[3deg] rounded-[16px] bg-ink px-4 py-3 text-[#fff8e6] shadow-xl sm:-right-8">
        <div className="text-[12px] text-[#e9d3b5]">Estimated risk</div>
        <div className="numeral mt-1 text-[30px] text-[#9be3b4]">Low, 22%</div>
      </div>

      <div className="absolute -left-2 bottom-2 z-10 max-w-[250px] rotate-[-2deg] rounded-[16px] border border-[#f8cfa9] bg-white p-4 shadow-xl sm:-left-10">
        <div className="text-[12px] font-semibold text-ember">Attendance warning</div>
        <p className="mt-1 text-[13.5px] leading-snug">Discrete Mathematics is at 70.6%. Attend the next 6 classes to reach 75%.</p>
      </div>
    </div>
  );
}
