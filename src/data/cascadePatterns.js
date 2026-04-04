// Prescribing cascade patterns database

export const cascadePatterns = [
  {
    id: "cascade_001",
    name: "CCB → Edema Cascade",
    description: "Calcium channel blocker causes ankle swelling, treated with diuretic, causing hypokalemia, treated with potassium supplement",
    chain: [
      { drug_class: "Calcium Channel Blocker", example: "amlodipine", causes: "ankle swelling", causes_symptom: "ankle swelling" },
      { drug_class: "Loop Diuretic", example: "furosemide", treats: "ankle swelling", causes: "hypokalemia", causes_symptom: "low potassium" },
      { drug_class: "Potassium Supplement", example: "potassium_chloride", treats: "hypokalemia", treats_symptom: "low potassium" }
    ],
    resolution: "Consider switching CCB to ACE inhibitor or ARB. May eliminate need for diuretic and K+ supplement.",
    pill_reduction: "3 → 1",
    savings_potential: 2,
    risk_level: "moderate"
  },
  {
    id: "cascade_002",
    name: "Statin → Pain Cascade",
    description: "Statin causes muscle pain, treated with NSAID, causing GI upset, treated with PPI",
    chain: [
      { drug_class: "Statin", example: "atorvastatin", causes: "muscle pain", causes_symptom: "muscle pain" },
      { drug_class: "NSAID", example: "ibuprofen", treats: "muscle pain", treats_symptom: "muscle pain", causes: "GI upset", causes_symptom: "stomach pain" },
      { drug_class: "PPI", example: "omeprazole", treats: "GI upset", treats_symptom: "stomach pain" }
    ],
    resolution: "Check CK levels. Consider lower statin dose, switching to rosuvastatin, or intermittent dosing. May allow stopping NSAID and PPI.",
    pill_reduction: "3 → 1",
    savings_potential: 2,
    risk_level: "moderate"
  },
  {
    id: "cascade_003",
    name: "ACE Inhibitor → Cough Cascade",
    description: "ACE inhibitor causes dry cough, treated with cough suppressant",
    chain: [
      { drug_class: "ACE Inhibitor", example: "lisinopril", causes: "dry cough", causes_symptom: "dry cough" },
      { drug_class: "Cough Suppressant", example: "benzonatate", treats: "dry cough", treats_symptom: "dry cough" }
    ],
    resolution: "Switch ACE inhibitor to ARB (e.g., losartan). Cough resolves in 1-4 weeks. Discontinue cough suppressant.",
    pill_reduction: "2 → 1",
    savings_potential: 1,
    risk_level: "low"
  },
  {
    id: "cascade_004",
    name: "SSRI → Sleep Cascade",
    description: "SSRI causes insomnia, treated with sleep aid",
    chain: [
      { drug_class: "SSRI", example: "sertraline", causes: "insomnia", causes_symptom: "trouble sleeping" },
      { drug_class: "Sleep Aid", example: "zolpidem", treats: "insomnia", treats_symptom: "trouble sleeping" }
    ],
    resolution: "Consider morning dosing of SSRI, sleep hygiene counseling, or switching to mirtazapine (which promotes sleep).",
    pill_reduction: "2 → 1",
    savings_potential: 1,
    risk_level: "moderate"
  },
  {
    id: "cascade_005",
    name: "NSAID → Hypertension Cascade",
    description: "NSAID causes hypertension, treated with antihypertensive, causing edema, treated with diuretic",
    chain: [
      { drug_class: "NSAID", example: "ibuprofen", causes: "hypertension", causes_symptom: "high blood pressure" },
      { drug_class: "Antihypertensive", example: "amlodipine", treats: "hypertension", treats_symptom: "high blood pressure", causes: "ankle swelling", causes_symptom: "ankle swelling" },
      { drug_class: "Loop Diuretic", example: "furosemide", treats: "ankle swelling", treats_symptom: "ankle swelling" }
    ],
    resolution: "Discontinue or reduce NSAID. Consider topical NSAID or acetaminophen. Blood pressure and edema may resolve without additional drugs.",
    pill_reduction: "3 → 0",
    savings_potential: 3,
    risk_level: "high"
  },
  {
    id: "cascade_006",
    name: "Cholinesterase Inhibitor → Anticholinergic Cascade (CRITICAL)",
    description: "Donepezil causes incontinence, treated with anticholinergic which opposes donepezil's cognitive benefits",
    chain: [
      { drug_class: "Cholinesterase Inhibitor", example: "donepezil", causes: "urinary incontinence", causes_symptom: "urinary incontinence" },
      { drug_class: "Anticholinergic", example: "oxybutynin", treats: "urinary incontinence", treats_symptom: "urinary incontinence" }
    ],
    resolution: "CRITICAL: Oxybutynin directly opposes donepezil and WORSENS cognitive decline. Reassess dementia medication benefit vs. incontinence burden. Consider behavioral interventions for incontinence.",
    pill_reduction: "Pharmacological conflict — not a simple reduction",
    savings_potential: 0,
    risk_level: "critical"
  }
];

export default cascadePatterns;
