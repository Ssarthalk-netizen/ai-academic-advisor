# AI Academic Advisor

**An Intelligent Personalized Academic Guidance and Student Support System**
AIML Essentials (E0523A) course project, Ajeenkya D Y Patil University.

A full-stack web app that understands a student's academic situation, flags risks early,
simulates CGPA targets, builds an adaptive study plan, and answers questions with an AI
advisor grounded in the student's own records.

## Architecture

```
Browser (Next.js + TypeScript + Tailwind)
   │  HTTPS, cookie session
   ▼
Next.js API routes (server only)  ── Zod validation · rate limits · origin check · safe errors
   │                 │                    │
   │                 │                    └── Gemini API (explanations, chat, roadmaps)
   │                 └── ML inference in TypeScript (models trained in Python, exported as JSON)
   ▼
Supabase: Postgres (Row Level Security on every table) · Auth · private Storage
```

| Module | Technique | Where |
|---|---|---|
| Academic risk prediction | Random Forest (100 trees) vs Decision Tree, 80/20 stratified split, balanced class weights, chosen on Recall | `ml/scripts/train_all.py` → `src/lib/ml/risk.ts` |
| Chatbot intent routing | TF-IDF (char n-grams) + Logistic Regression, escalate below 0.55 confidence | `src/lib/ml/intent.ts`, `src/app/api/chat` |
| Course recommender | TF-IDF + cosine similarity, popularity cold start | `src/lib/ml/recommender.ts` |
| Risk Radar | Transparent rules (attendance, marks, trends, deadlines, exams) | `src/lib/academics/radar.ts` |
| CGPA / What-If | Deterministic grading maths (no AI) | `src/lib/academics/grading.ts` |
| Adaptive study planner | Priority scoring + capacity-aware scheduling + missed-session recovery | `src/lib/academics/planner.ts` |
| Career pathways | Curated knowledge base + skill-gap analysis + Gemini roadmap | `src/lib/academics/careers.ts` |

### Model results (test set, 885 students)

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|
| Decision Tree | 0.851 | 0.742 | 0.820 | 0.779 | 0.910 |
| **Random Forest** (selected) | **0.875** | **0.795** | **0.820** | **0.808** | **0.928** |

- Intent classifier: 30 intents, 396 phrases, 5-fold CV accuracy 0.73. All out-of-scope test questions fell below the 0.55 threshold and were routed to Gemini.
- Recommender: Precision@5 = 0.85 (random baseline 0.27).
- The Kaggle career dataset was tested and **rejected** (12.6% accuracy on 10 classes, close to random), so career guidance uses a knowledge base instead.

All numbers are in `ml/artifacts/metrics.json`.

## Datasets

- *Predict Students' Dropout and Academic Success* (UCI / Kaggle, 4,424 students): risk model
- *Udemy Courses* (Kaggle, 3,678 courses) + 48 hand-written university electives: recommender
- *University chatbot intents* (Kaggle) + 10 advisor intents written for this project: chatbot

## Run locally

1. Install Node.js 20+.
2. Create `.env.local` from `.env.example` and fill in your Supabase and Gemini keys.
3. In Supabase → SQL Editor, run `supabase/migrations/0001_init.sql` once.
4. Run:
   ```bash
   npm install
   npm run dev
   ```
   Then open http://localhost:3000.

Retrain the ML models (optional): `cd ml && pip install -r requirements.txt && python -m scripts.train_all`

## Security & privacy

- Row Level Security on every table: a student can only read or write their own rows (tested in `supabase/tests/rls_test.sql`).
- Secrets live only in environment variables. The Gemini and service-role keys are used server-side only.
- Every input is checked against a strict schema. Unknown fields are rejected.
- Rate limits on login/signup/reset (per IP and per account) and on AI routes (per user). All limits can be configured.
- Users get generic error messages. Full details are logged on the server only.
- Security headers: CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy.
- Uploads are PDF only (10 MB max) and stored in a private bucket, one folder per user.
- Data export, account deletion, AI-consent toggle, and AI output always labelled.

`npm audit --omit=dev` reports 0 vulnerabilities in production dependencies.
