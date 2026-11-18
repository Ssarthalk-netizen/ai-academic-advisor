import "server-only";
import model from "./models/risk_model.json";

/**
 * Academic risk model — Random Forest trained in Python (ml/scripts/train_all.py)
 * on the UCI "Predict Students' Dropout and Academic Success" dataset and exported
 * as JSON. This file walks the exported trees, exactly like scikit-learn's
 * predict_proba, so no Python server is needed at runtime.
 */

type Tree = { l: number[]; r: number[]; f: number[]; t: number[]; v: number[] };
type RiskModel = {
  type: string;
  features: string[];
  labels: Record<string, string>;
  direction: Record<string, number>;
  importance: Record<string, number>;
  reference: Record<string, number>;
  thresholds: { medium: number; high: number };
  trees: Tree[];
};

const M = model as unknown as RiskModel;

export type RiskFeatures = Record<string, number>;
export type RiskLevel = "Low" | "Medium" | "High";
export type RiskFactor = {
  feature: string;
  label: string;
  value: number;
  typical: number;
  weight: number;
};

function treeProba(tree: Tree, x: number[]): number {
  let node = 0;
  while (tree.l[node] !== -1) {
    node = x[tree.f[node]] <= tree.t[node] ? tree.l[node] : tree.r[node];
  }
  return tree.v[node];
}

export function riskLevel(p: number): RiskLevel {
  return p >= M.thresholds.high ? "High" : p >= M.thresholds.medium ? "Medium" : "Low";
}

/** Features where this student is worse than the median student who did NOT drop out. */
export function explainRisk(f: RiskFeatures, top = 5): RiskFactor[] {
  const out: RiskFactor[] = [];
  const ordered = [...M.features].sort((a, b) => M.importance[b] - M.importance[a]);
  for (const name of ordered) {
    const v = f[name];
    const ref = M.reference[name];
    if (v === undefined || ref === undefined) continue;
    if ((v - ref) * M.direction[name] > 1e-9) {
      out.push({ feature: name, label: M.labels[name], value: v, typical: ref, weight: M.importance[name] });
    }
    if (out.length >= top) break;
  }
  return out;
}

export function predictRisk(f: RiskFeatures) {
  const x = M.features.map((name) => {
    const v = f[name];
    if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`missing feature ${name}`);
    return v;
  });
  const p = M.trees.reduce((s, t) => s + treeProba(t, x), 0) / M.trees.length;
  return { probability: p, level: riskLevel(p), factors: explainRisk(f), model: M.type };
}

export const riskModelInfo = {
  type: M.type,
  features: M.features,
  labels: M.labels,
  importance: M.importance,
  thresholds: M.thresholds,
};
