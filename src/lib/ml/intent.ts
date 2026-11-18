import "server-only";
import model from "./models/intent_model.json";
import kb from "./models/intents.json";

/**
 * Chatbot intent classifier — TF-IDF (character n-grams within word boundaries,
 * sublinear tf, L2 norm) + multinomial Logistic Regression, trained in Python
 * and exported as JSON. Re-implements scikit-learn's char_wb analyzer exactly.
 */

type IntentModel = {
  vocab: Record<string, number>;
  idf: number[];
  classes: string[];
  coef: number[][];
  intercept: number[];
  ngram: [number, number];
  threshold: number;
};
type Intent = { tag: string; patterns: string[]; responses: string[] };

const M = model as unknown as IntentModel;
const INTENTS = new Map((kb as { intents: Intent[] }).intents.map((i) => [i.tag, i]));

function charWbNgrams(text: string, minN: number, maxN: number): string[] {
  const doc = text.toLowerCase().replace(/\s\s+/g, " ");
  const grams: string[] = [];
  for (const raw of doc.split(/\s+/).filter(Boolean)) {
    const w = ` ${raw} `;
    for (let n = minN; n <= maxN; n++) {
      let offset = 0;
      grams.push(w.slice(offset, offset + n));
      while (offset + n < w.length) {
        offset += 1;
        grams.push(w.slice(offset, offset + n));
      }
      if (offset === 0) break; // word shorter than n
    }
  }
  return grams;
}

function vectorize(text: string): Map<number, number> {
  const counts = new Map<number, number>();
  for (const g of charWbNgrams(text, M.ngram[0], M.ngram[1])) {
    const idx = M.vocab[g];
    if (idx !== undefined) counts.set(idx, (counts.get(idx) ?? 0) + 1);
  }
  let norm = 0;
  for (const [i, c] of counts) {
    const v = (1 + Math.log(c)) * M.idf[i];
    counts.set(i, v);
    norm += v * v;
  }
  norm = Math.sqrt(norm) || 1;
  for (const [i, v] of counts) counts.set(i, v / norm);
  return counts;
}

export type IntentResult = { intent: string; confidence: number; inScope: boolean; ranked: { intent: string; p: number }[] };

export function classifyIntent(text: string): IntentResult {
  const x = vectorize(text);
  const logits = M.classes.map((_, k) => {
    let z = M.intercept[k];
    for (const [i, v] of x) z += M.coef[k][i] * v;
    return z;
  });
  const max = Math.max(...logits);
  const exps = logits.map((z) => Math.exp(z - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  const ranked = M.classes
    .map((c, k) => ({ intent: c, p: exps[k] / sum }))
    .sort((a, b) => b.p - a.p);
  return { intent: ranked[0].intent, confidence: ranked[0].p, inScope: ranked[0].p >= M.threshold, ranked: ranked.slice(0, 3) };
}

export function intentResponse(tag: string): string | undefined {
  return INTENTS.get(tag)?.responses[0];
}

export const INTENT_THRESHOLD = M.threshold;
