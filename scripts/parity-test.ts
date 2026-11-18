// Checks that the TypeScript model inference matches scikit-learn exactly.
// Run: node --conditions=react-server --import tsx scripts/parity-test.ts /tmp/parity.json
import fs from "node:fs";
import { predictRisk } from "../src/lib/ml/risk";
import { classifyIntent } from "../src/lib/ml/intent";
import { recommendCourses } from "../src/lib/ml/recommender";
const ref = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
let maxErr = 0;
for (const r of ref.risk) maxErr = Math.max(maxErr, Math.abs(predictRisk(r.f).probability - r.p));
console.log(`risk: ${ref.risk.length} rows, max |TS - Python| = ${maxErr.toExponential(2)}`);
let ok = 0;
for (const i of ref.intents) {
  const r = classifyIntent(i.q);
  const same = r.intent === i.tag && Math.abs(r.confidence - i.p) < 1e-3;
  ok += same ? 1 : 0;
  console.log(`${same ? "OK " : "BAD"} ${i.q} -> ${r.intent} ${r.confidence.toFixed(3)} (py ${i.tag} ${i.p.toFixed(3)})`);
}
console.log(`intents: ${ok}/${ref.intents.length} match`);
const rec = recommendCourses({ interests: ["machine learning", "python"], preferLevel: "Intermediate" });
console.log("electives:", rec.electives.map((c) => c.title));
console.log("online:", rec.online.map((c) => c.title));
console.log("cold:", recommendCourses({ interests: [] }).online.slice(0, 3).map((c) => c.title));
