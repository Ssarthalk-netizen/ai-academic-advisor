import metrics from "@/lib/ml/models/metrics.json";
import { PageHeader, Section } from "@/components/ui";

export const metadata = { title: "How the AI works" };

type ModelM = { accuracy: number; precision: number; recall: number; f1: number; roc_auc: number; confusion_matrix: number[][]; cv_recall: number; cv_f1: number };
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export default function ModelsPage() {
  const r = metrics.risk;
  const models = r.models as Record<string, ModelM>;
  const best = models[r.best_model];
  const [[tn, fp], [fn, tp]] = best.confusion_matrix;
  const maxImp = r.feature_importance[0].importance;
  const c = metrics.chatbot;
  const rec = metrics.recommender;

  return (
    <div className="space-y-12">
      <PageHeader title="How the AI works" intro="Every model in this app, the data it learned from, and how well it does on students it never saw during training." />

      <section className="rounded-[22px] bg-night p-6 text-[#fbeedb] sm:p-8">
        <h2 className="display text-[26px] text-[#fff3d6]">The pipeline</h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-5">
          {[
            ["Preprocess", "Clean Kaggle data, convert grades to a 10-point scale, engineer pass rates and SGPA trend"],
            ["Feature store", "The same 15 features are built from your own records"],
            ["Module router", "Risk model, intent classifier, recommender and rule-based radar"],
            ["Aggregate", "Combine results into priorities and alerts"],
            ["Explain", "Dashboard and Gemini turn results into plain language"],
          ].map(([t, b], i) => (
            <li key={t} className="border-t border-[#5a3a28] pt-4">
              <span className="numeral text-[24px] text-butter">{i + 1}</span>
              <div className="mt-2 font-semibold text-[#fff3d6]">{t}</div>
              <p className="mt-1 text-[13px] text-[#cdb59e]">{b}</p>
            </li>
          ))}
        </ol>
      </section>

      <Section title="Academic risk model">
        <p className="max-w-3xl text-[14.5px] text-ink-soft">
          Trained on <strong className="text-ink">{r.dataset}</strong>: {r.rows.toLocaleString()} students, {pct(r.positive_rate)} of whom dropped out.
          80/20 stratified split ({r.train_size} train, {r.test_size} test), balanced class weights, 5-fold cross-validation.
          The model is chosen on <strong className="text-ink">recall</strong>, because missing a struggling student is worse than a false alarm.
        </p>
        <div className="mt-5 overflow-x-auto rounded-[16px] border border-line bg-white">
          <table className="w-full min-w-[640px] text-[14px]">
            <thead className="border-b border-line text-left text-[12.5px] text-ink-soft"><tr>{["Model", "Accuracy", "Precision", "Recall", "F1", "ROC-AUC", "CV recall"].map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {Object.entries(models).map(([name, m]) => (
                <tr key={name} className={`border-b border-line last:border-0 ${name === r.best_model ? "bg-butter-soft/60 font-semibold" : ""}`}>
                  <td className="px-4 py-2.5">{name}{name === r.best_model && " (used)"}</td>
                  {[m.accuracy, m.precision, m.recall, m.f1, m.roc_auc, m.cv_recall].map((v, i) => <td key={i} className="px-4 py-2.5 tabular-nums">{pct(v)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[auto_1fr]">
          <div>
            <h3 className="font-semibold">Confusion matrix, {r.best_model}</h3>
            <p className="text-[13px] text-ink-soft">{r.test_size} unseen students</p>
            <div className="mt-3 grid grid-cols-[auto_auto_auto] gap-1.5 text-center text-[13px]">
              <span />
              <span className="px-2 text-ink-soft">Predicted safe</span><span className="px-2 text-ink-soft">Predicted at risk</span>
              <span className="self-center pr-2 text-right text-ink-soft">Actually completed</span>
              <Cell n={tn} label="correct" good /><Cell n={fp} label="false alarm" />
              <span className="self-center pr-2 text-right text-ink-soft">Actually dropped out</span>
              <Cell n={fn} label="missed" /><Cell n={tp} label="caught" good />
            </div>
          </div>
          <div>
            <h3 className="font-semibold">What the model relies on</h3>
            <ul className="mt-3 space-y-2">
              {r.feature_importance.slice(0, 10).map((f) => (
                <li key={f.feature} className="grid grid-cols-[minmax(0,14rem)_1fr_3rem] items-center gap-3 text-[13.5px]">
                  <span className="truncate">{f.label}</span>
                  <span className="h-2 rounded-full bg-butter-soft"><span className="block h-full rounded-full bg-ink" style={{ width: `${(f.importance / maxImp) * 100}%` }} /></span>
                  <span className="text-right tabular-nums text-ink-soft">{(f.importance * 100).toFixed(1)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-6 max-w-3xl text-[13.5px] text-ink-soft">
          <strong className="text-ink">Fairness choice:</strong> nationality, marital status, gender, parents&apos; occupations and national economic indicators were in the dataset but deliberately left out. They aren&apos;t things a student or advisor can act on, and they can encode bias.
        </p>
      </Section>

      <Section title="Chatbot intent classifier">
        <p className="max-w-3xl text-[14.5px] text-ink-soft">
          TF-IDF over character n-grams (2 to 5) plus logistic regression, trained on {c.patterns} example questions across {c.intents} intents
          (Kaggle university intents plus 10 advisor intents written for this project). Character n-grams cope better with typos and short questions.
        </p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <Metric value={pct(c.cv_accuracy)} label="5-fold cross-validated accuracy" />
          <Metric value={`${c.threshold}`} label="Confidence below this goes to Gemini" />
          <Metric value={`${c.out_of_scope_escalated}/${c.out_of_scope_total}`} label="Off-topic test questions correctly sent onward" />
        </dl>
      </Section>

      <Section title="Course recommender">
        <p className="max-w-3xl text-[14.5px] text-ink-soft">
          Content-based filtering: TF-IDF (1 to 2 word n-grams) over {rec.catalog_size.toLocaleString()} courses ({rec.electives} university electives plus the Kaggle Udemy catalog),
          cosine similarity against your interests and goal, then a small popularity boost. With no interests it falls back to popularity (cold start).
        </p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <Metric value={rec.precision_at_5.toFixed(2)} label="Precision@5 (same-category hits)" />
          <Metric value={rec.random_baseline_precision_at_5.toFixed(2)} label="Random baseline" />
          <Metric value={rec.queries_evaluated.toString()} label="Test queries" />
        </dl>
      </Section>

      <Section title="A model we rejected">
        <p className="max-w-3xl text-[14.5px] text-ink-soft">{metrics.career_note} Shipping a model that is barely better than guessing would mislead students, so career paths use a curated knowledge base with skill-gap analysis instead.</p>
      </Section>

      <Section title="Generative AI (Gemini)">
        <p className="max-w-3xl text-[14.5px] text-ink-soft">
          Gemini never calculates grades or risk. It receives the numbers computed above (without your name, email or date of birth) and explains them,
          answers questions, writes roadmaps and weekly reports. Every AI answer is labelled, and AI features only run after you opt in.
        </p>
      </Section>
    </div>
  );
}

function Cell({ n, label, good }: { n: number; label: string; good?: boolean }) {
  return <div className={`rounded-[12px] px-5 py-4 ${good ? "bg-leaf-soft" : "bg-ember-soft"}`}><div className="numeral text-[28px]">{n}</div><div className="text-[12px] text-ink-soft">{label}</div></div>;
}
function Metric({ value, label }: { value: string; label: string }) {
  return <div className="card p-4"><dt className="text-[13px] text-ink-soft">{label}</dt><dd className="numeral mt-2 text-[32px]">{value}</dd></div>;
}
