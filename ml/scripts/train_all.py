"""
Train every ML model used by the AI Academic Advisor and export them as JSON
so the Next.js app can run inference in TypeScript (no Python server needed).

Run from the ml/ folder:
    python -m scripts.train_all

Outputs (ml/artifacts/ and copied to ../src/lib/ml/models/):
    risk_model.json     Random Forest (or Decision Tree) for academic risk
    intent_model.json   TF-IDF + Logistic Regression intent classifier
    courses.json        course catalog used by the TF-IDF recommender
    intents.json        intent knowledge base (patterns + responses)
    metrics.json        every evaluation number shown on the Model Performance page
"""
from __future__ import annotations
import json
import shutil
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, classification_report, confusion_matrix,
                             f1_score, precision_score, recall_score, roc_auc_score)
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.tree import DecisionTreeClassifier

from src import preprocess as pp

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts"
APP_MODELS = ROOT.parent / "src" / "lib" / "ml" / "models"
SEED = 42

# Features the web app can derive from a student's own records.
RISK_FEATURES = [
    "admission_grade", "age_at_enrollment", "scholarship_holder", "debtor",
    "tuition_up_to_date", "displaced",
    "sem1_enrolled", "sem1_approved", "sem1_grade",
    "sem2_enrolled", "sem2_approved", "sem2_grade",
    "sem1_pass_rate", "sem2_pass_rate", "grade_trend",
]
RISK_DIRECTION = {  # +1: higher value = riskier, -1: lower value = riskier
    "admission_grade": -1, "age_at_enrollment": 1, "scholarship_holder": -1, "debtor": 1,
    "tuition_up_to_date": -1, "displaced": -1, "sem1_enrolled": -1, "sem1_approved": -1,
    "sem1_grade": -1, "sem2_enrolled": -1, "sem2_approved": -1, "sem2_grade": -1,
    "sem1_pass_rate": -1, "sem2_pass_rate": -1, "grade_trend": -1,
}
FEATURE_LABELS = {
    "admission_grade": "Admission score (%)", "age_at_enrollment": "Age at enrolment",
    "scholarship_holder": "Scholarship holder", "debtor": "Outstanding dues",
    "tuition_up_to_date": "Fees paid up to date", "displaced": "Studying away from home",
    "sem1_enrolled": "Previous sem: subjects enrolled", "sem1_approved": "Previous sem: subjects passed",
    "sem1_grade": "Previous sem: SGPA", "sem2_enrolled": "Latest sem: subjects enrolled",
    "sem2_approved": "Latest sem: subjects passed", "sem2_grade": "Latest sem: SGPA",
    "sem1_pass_rate": "Previous sem: pass rate", "sem2_pass_rate": "Latest sem: pass rate",
    "grade_trend": "SGPA change (previous → latest)",
}


def r4(x):
    return round(float(x), 4)


def export_tree(tree, n_classes: int) -> dict:
    t = tree.tree_
    val = t.value[:, 0, :]
    val = val / val.sum(axis=1, keepdims=True)
    return {
        "l": t.children_left.tolist(), "r": t.children_right.tolist(),
        "f": t.feature.tolist(), "t": [round(float(x), 5) for x in t.threshold],
        "v": [[round(float(p), 4) for p in row] for row in val] if n_classes > 2 else [round(float(row[1]), 4) for row in val],
    }


# ---------------------------------------------------------------- risk model
def train_risk(students: pd.DataFrame) -> tuple[dict, dict]:
    X, y = students[RISK_FEATURES].astype(float), students["at_risk"]
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=SEED)
    cands = {
        "Decision Tree": DecisionTreeClassifier(max_depth=6, min_samples_leaf=10, class_weight="balanced", random_state=SEED),
        "Random Forest": RandomForestClassifier(n_estimators=100, max_depth=10, min_samples_leaf=5,
                                                class_weight="balanced", random_state=SEED, n_jobs=-1),
    }
    cv = StratifiedKFold(5, shuffle=True, random_state=SEED)
    res, fitted = {}, {}
    for name, m in cands.items():
        m.fit(X_tr, y_tr)
        prob = m.predict_proba(X_te)[:, 1]
        pred = (prob >= 0.5).astype(int)
        res[name] = {
            "accuracy": r4(accuracy_score(y_te, pred)), "precision": r4(precision_score(y_te, pred)),
            "recall": r4(recall_score(y_te, pred)), "f1": r4(f1_score(y_te, pred)),
            "roc_auc": r4(roc_auc_score(y_te, prob)),
            "confusion_matrix": confusion_matrix(y_te, pred).tolist(),
            "cv_recall": r4(cross_val_score(m, X_tr, y_tr, cv=cv, scoring="recall").mean()),
            "cv_f1": r4(cross_val_score(m, X_tr, y_tr, cv=cv, scoring="f1").mean()),
        }
        fitted[name] = m
    best = max(res, key=lambda n: (round(res[n]["recall"], 2), res[n]["f1"]))
    model = fitted[best]
    trees = model.estimators_ if hasattr(model, "estimators_") else [model]
    imp = sorted(zip(RISK_FEATURES, model.feature_importances_), key=lambda t: -t[1])
    reference = students.loc[students.at_risk == 0, RISK_FEATURES].median()
    export = {
        "type": best, "features": RISK_FEATURES, "labels": FEATURE_LABELS, "direction": RISK_DIRECTION,
        "importance": {f: r4(v) for f, v in imp},
        "reference": {f: r4(v) for f, v in reference.items()},
        "thresholds": {"medium": 0.3, "high": 0.6},
        "trees": [export_tree(t, 2) for t in trees],
    }
    metrics = {
        "dataset": "Predict Students' Dropout and Academic Success (UCI / Kaggle)",
        "rows": int(len(students)), "train_size": int(len(y_tr)), "test_size": int(len(y_te)),
        "positive_rate": r4(y.mean()), "best_model": best, "models": res,
        "feature_importance": [{"feature": f, "label": FEATURE_LABELS[f], "importance": r4(v)} for f, v in imp],
    }
    return export, metrics


# ------------------------------------------- career model (experiment only)
# Kept for reproducibility: this model scored 12.6% accuracy (random = 10%)
# on the Kaggle career dataset, so it is NOT used by the app. Run it with
#   python -c "from scripts.train_all import *; print(train_career(pd.read_csv(pp.PROC/'career.csv'))[1])"
CAREER_SUBJECTS = ["Physics", "Chemistry", "Biology", "English", "ComputerScience", "Mathematics",
                   "Accountancy", "BusinessStudies", "Economics", "History", "Geography",
                   "PoliticalScience", "Sociology"]


def train_career(df: pd.DataFrame) -> tuple[dict, dict]:
    streams = sorted(df.Stream.unique())
    for s in streams:
        df[f"Stream_{s}"] = (df.Stream == s).astype(int)
    feats = CAREER_SUBJECTS + [c for c in df.columns if c.startswith(("Interest_", "Participated_"))] + ["PositiveThinking"] + [f"Stream_{s}" for s in streams]
    X, y = df[feats].astype(float), df.CareerOption
    classes = sorted(y.unique())
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=SEED)
    m = RandomForestClassifier(n_estimators=60, max_depth=12, min_samples_leaf=3, random_state=SEED, n_jobs=-1).fit(X_tr, y_tr)
    pred = m.predict(X_te)
    dt = DecisionTreeClassifier(max_depth=10, random_state=SEED).fit(X_tr, y_tr)
    rep = classification_report(y_te, pred, output_dict=True, zero_division=0)
    export = {"features": feats, "classes": list(m.classes_), "streams": streams,
              "trees": [export_tree(t, len(classes)) for t in m.estimators_]}
    metrics = {
        "dataset": "Indian Education Career Advisor dataset (Kaggle, 5,000 students)",
        "rows": int(len(df)), "classes": classes,
        "random_forest_accuracy": r4(accuracy_score(y_te, pred)),
        "decision_tree_accuracy": r4(accuracy_score(y_te, dt.predict(X_te))),
        "macro_f1": r4(rep["macro avg"]["f1-score"]),
        "per_class_f1": {c: r4(rep[c]["f1-score"]) for c in classes},
        "confusion_matrix": confusion_matrix(y_te, pred, labels=list(m.classes_)).tolist(),
    }
    return export, metrics


# -------------------------------------------------------------- intent model
def train_intents(intents: dict) -> tuple[dict, dict]:
    rows = [(p, it["tag"]) for it in intents["intents"] for p in it["patterns"]]
    X_txt, y = [r[0] for r in rows], [r[1] for r in rows]
    # Character n-grams within word boundaries cope better with typos and the
    # small number of example phrases per intent (CV accuracy 0.73 vs 0.65 for word n-grams).
    vec = TfidfVectorizer(lowercase=True, analyzer="char_wb", ngram_range=(2, 5), sublinear_tf=True)
    clf = LogisticRegression(max_iter=4000, C=20)
    # cross-validated accuracy (patterns per intent are few, so use 5-fold)
    cv = StratifiedKFold(5, shuffle=True, random_state=SEED)
    accs = []
    for tr, te in cv.split(X_txt, y):
        v = TfidfVectorizer(**vec.get_params()).fit([X_txt[i] for i in tr])
        c = LogisticRegression(max_iter=4000, C=20).fit(v.transform([X_txt[i] for i in tr]), [y[i] for i in tr])
        accs.append(accuracy_score([y[i] for i in te], c.predict(v.transform([X_txt[i] for i in te]))))
    Xv = vec.fit_transform(X_txt)
    clf.fit(Xv, y)
    # confidence of out-of-scope sentences, to justify the 0.55 escalation threshold
    oos = ["what is the capital of france", "tell me a joke about cats", "how do i cook pasta",
           "who won the cricket match yesterday", "explain quantum entanglement", "what is bitcoin price"]
    oos_conf = clf.predict_proba(vec.transform(oos)).max(axis=1)
    export = {
        "vocab": {k: int(v) for k, v in vec.vocabulary_.items()},
        "idf": [round(float(x), 5) for x in vec.idf_],
        "classes": list(clf.classes_),
        "coef": [[round(float(x), 4) for x in row] for row in clf.coef_],
        "intercept": [round(float(x), 4) for x in clf.intercept_],
        "analyzer": "char_wb", "ngram": [2, 5], "sublinear_tf": True, "threshold": 0.55,
    }
    metrics = {"dataset": "Kaggle university_intents + project advisor intents",
               "intents": len(set(y)), "patterns": len(y),
               "cv_accuracy": r4(np.mean(accs)), "cv_accuracy_std": r4(np.std(accs)),
               "threshold": 0.55, "out_of_scope_mean_confidence": r4(oos_conf.mean()),
               "out_of_scope_escalated": int((oos_conf < 0.55).sum()), "out_of_scope_total": len(oos)}
    return export, metrics


# ------------------------------------------------------- recommender (eval)
def eval_recommender(courses: pd.DataFrame) -> dict:
    """Proxy Precision@5: use each course title as a query; a hit is a course in the same category."""
    vec = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True)
    M = vec.fit_transform(courses.text)
    rng = np.random.default_rng(SEED)
    idx = rng.choice(len(courses), size=min(600, len(courses)), replace=False)
    precs = []
    for i in idx:
        q = vec.transform([courses.title.iloc[i].lower()])
        sims = cosine_similarity(q, M).ravel()
        sims[i] = -1
        top = np.argsort(-sims)[:5]
        precs.append((courses.category.iloc[top] == courses.category.iloc[i]).mean())
    pop = courses.category.value_counts(normalize=True)
    baseline = float((pop ** 2).sum())  # expected precision of random picks
    return {"method": "TF-IDF (1-2 grams) + cosine similarity", "catalog_size": int(len(courses)),
            "electives": int((courses.source == "University elective").sum()),
            "precision_at_5": r4(np.mean(precs)), "random_baseline_precision_at_5": r4(baseline),
            "queries_evaluated": int(len(idx))}


def main():
    pp.run()
    proc = pp.PROC
    students = pd.read_csv(proc / "students.csv")
    courses = pd.read_csv(proc / "courses.csv")
    intents = json.load(open(proc / "intents.json", encoding="utf-8"))

    ART.mkdir(exist_ok=True)
    risk, m_risk = train_risk(students)
    intent_m, m_intent = train_intents(intents)
    m_rec = eval_recommender(courses)

    cat = courses[["course_id", "title", "category", "level", "source", "url", "popularity", "price", "is_paid", "keywords"]].copy()
    cat["keywords"] = cat["keywords"].fillna("")
    cat["url"] = cat["url"].fillna("")
    out = {
        "risk_model.json": risk, "intent_model.json": intent_m,
        "courses.json": cat.to_dict(orient="records"), "intents.json": intents,
        "metrics.json": {"risk": m_risk, "chatbot": m_intent, "recommender": m_rec,
                         "career_note": "Kaggle career dataset tested and rejected: Random Forest accuracy 12.6% on 10 classes (random = 10%), so career guidance uses a knowledge-based pathway map + Gemini instead."},
    }
    APP_MODELS.mkdir(parents=True, exist_ok=True)
    for name, obj in out.items():
        p = ART / name
        json.dump(obj, open(p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        shutil.copy(p, APP_MODELS / name)
        print(f"{name:20s} {p.stat().st_size/1024:8.1f} KB")
    print(json.dumps(out["metrics.json"], indent=1)[:3000])


if __name__ == "__main__":
    main()
