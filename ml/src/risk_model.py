"""
Module 2: Academic risk classifier.

Decision Tree vs Random Forest (100 trees), 80/20 stratified split,
balanced class weights, model chosen on Recall for the at-risk class
(missing a struggling student costs more than a false alarm).
"""
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (accuracy_score, confusion_matrix, f1_score,
                             precision_score, recall_score, roc_auc_score)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.tree import DecisionTreeClassifier

from .preprocess import FEATURE_LABELS, RISK_FEATURES

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "models" / "risk_model.joblib"

# Direction in which each feature increases risk (+1 = higher is riskier)
RISK_DIRECTION = {
    "admission_grade": -1, "age_at_enrollment": +1, "scholarship_holder": -1, "debtor": +1,
    "tuition_up_to_date": -1, "displaced": -1,
    "sem1_enrolled": -1, "sem1_evaluations": -1, "sem1_approved": -1, "sem1_grade": -1, "sem1_without_eval": +1,
    "sem2_enrolled": -1, "sem2_evaluations": -1, "sem2_approved": -1, "sem2_grade": -1, "sem2_without_eval": +1,
    "sem1_pass_rate": -1, "sem2_pass_rate": -1, "grade_trend": -1,
}


def _metrics(y_true, y_pred, y_prob):
    return {
        "accuracy": round(accuracy_score(y_true, y_pred), 4),
        "precision": round(precision_score(y_true, y_pred), 4),
        "recall": round(recall_score(y_true, y_pred), 4),
        "f1": round(f1_score(y_true, y_pred), 4),
        "roc_auc": round(roc_auc_score(y_true, y_prob), 4),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
    }


def train(students: pd.DataFrame, seed: int = 42) -> dict:
    X, y = students[RISK_FEATURES], students["at_risk"]
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=seed)

    candidates = {
        "Decision Tree": DecisionTreeClassifier(max_depth=6, min_samples_leaf=10,
                                                class_weight="balanced", random_state=seed),
        "Random Forest": RandomForestClassifier(n_estimators=100, max_depth=12, min_samples_leaf=3,
                                                class_weight="balanced", random_state=seed, n_jobs=-1),
    }
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=seed)
    results, fitted = {}, {}
    for name, model in candidates.items():
        model.fit(X_tr, y_tr)
        prob = model.predict_proba(X_te)[:, 1]
        pred = (prob >= 0.5).astype(int)
        m = _metrics(y_te, pred, prob)
        m["cv_recall_mean"] = round(cross_val_score(model, X_tr, y_tr, cv=cv, scoring="recall").mean(), 4)
        m["cv_f1_mean"] = round(cross_val_score(model, X_tr, y_tr, cv=cv, scoring="f1").mean(), 4)
        results[name], fitted[name] = m, model

    # Pick on Recall; break near-ties (within 2 points) on F1 so we don't
    # choose a model that simply flags everyone.
    best = max(results, key=lambda n: (round(results[n]["recall"], 2), results[n]["f1"]))
    model = fitted[best]
    importances = sorted(zip(RISK_FEATURES, model.feature_importances_), key=lambda t: -t[1])

    # Reference profile of students who did NOT drop out, used to explain predictions
    reference = students.loc[students.at_risk == 0, RISK_FEATURES].median().to_dict()

    MODEL_PATH.parent.mkdir(exist_ok=True)
    joblib.dump({"model": model, "name": best, "features": RISK_FEATURES, "reference": reference}, MODEL_PATH)
    return {
        "best_model": best,
        "models": results,
        "test_size": int(len(y_te)), "train_size": int(len(y_tr)),
        "positive_rate": round(float(y.mean()), 4),
        "feature_importance": [{"feature": f, "label": FEATURE_LABELS[f], "importance": round(float(v), 4)} for f, v in importances],
    }


class RiskPredictor:
    def __init__(self):
        b = joblib.load(MODEL_PATH)
        self.model, self.name, self.features, self.reference = b["model"], b["name"], b["features"], b["reference"]
        self.importance = dict(zip(self.features, self.model.feature_importances_))

    @staticmethod
    def level(p: float) -> str:
        return "High" if p >= 0.6 else "Medium" if p >= 0.3 else "Low"

    def predict(self, row: pd.Series | dict) -> dict:
        row = pd.Series(row)
        p = float(self.model.predict_proba(pd.DataFrame([row[self.features].astype(float)]))[0, 1])
        return {"probability": p, "level": self.level(p), "factors": self.explain(row)}

    def predict_many(self, df: pd.DataFrame) -> np.ndarray:
        return self.model.predict_proba(df[self.features].astype(float))[:, 1]

    def explain(self, row: pd.Series, top: int = 5) -> list[dict]:
        """Important features where this student is worse than the typical non-dropout student."""
        out = []
        for f in sorted(self.features, key=lambda f: -self.importance[f]):
            v, ref, d = float(row[f]), float(self.reference[f]), RISK_DIRECTION[f]
            worse = (v - ref) * d > 0
            if worse and abs(v - ref) > 1e-9:
                out.append({"feature": f, "label": FEATURE_LABELS[f], "value": v, "typical": ref,
                            "weight": float(self.importance[f])})
            if len(out) >= top:
                break
        return out


def interventions(factors: list[dict], level: str) -> list[str]:
    tips = []
    keys = {f["feature"] for f in factors}
    if keys & {"sem2_approved", "sem2_pass_rate", "sem1_approved", "sem1_pass_rate"}:
        tips.append("Book a meeting with your faculty advisor to plan how to clear pending subjects (re-exam / supplementary).")
    if keys & {"sem1_grade", "sem2_grade", "grade_trend"}:
        tips.append("Join peer tutoring or remedial sessions for your weakest subjects and practise with past papers.")
    if keys & {"sem1_evaluations", "sem2_evaluations", "sem1_without_eval", "sem2_without_eval"}:
        tips.append("Attempt every internal assessment. Skipped evaluations are one of the strongest early warning signs.")
    if keys & {"tuition_up_to_date", "debtor"}:
        tips.append("Contact the accounts / financial-aid office about instalment plans or scholarships.")
    if "scholarship_holder" in keys:
        tips.append("Check eligibility for merit or need-based scholarships on the scholarship portal.")
    if level == "High":
        tips.insert(0, "Priority: your advisor will be notified for a one-to-one check-in this week.")
    if not tips:
        tips.append("Keep up your current routine and review progress with your mentor each month.")
    return tips
