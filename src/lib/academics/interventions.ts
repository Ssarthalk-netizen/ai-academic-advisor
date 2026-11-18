/** Suggested support actions for the ML risk factors (pure, used in the UI). */
export function interventions(factorKeys: string[], level: string): string[] {
  const k = new Set(factorKeys);
  const tips: string[] = [];
  if (level === "High") tips.push("Book a one-to-one with your faculty mentor this week and share this page.");
  if (["sem2_approved", "sem2_pass_rate", "sem1_approved", "sem1_pass_rate"].some((x) => k.has(x)))
    tips.push("Plan how to clear any failed subject: check the re-exam dates and start revising it alongside current work.");
  if (["sem1_grade", "sem2_grade", "grade_trend"].some((x) => k.has(x)))
    tips.push("Join peer tutoring or remedial sessions for your weakest subjects and practise with past papers.");
  if (["tuition_up_to_date", "debtor"].some((x) => k.has(x)))
    tips.push("Talk to the accounts or financial-aid office about instalment plans. Fee stress is a strong dropout signal.");
  if (k.has("scholarship_holder")) tips.push("Check whether you qualify for a merit or need-based scholarship.");
  if (k.has("admission_grade")) tips.push("Strengthen foundations: revisit basics of the subjects that feel hardest before moving on.");
  if (tips.length === 0) tips.push("Keep your current routine and check this page after each assessment.");
  return tips;
}
