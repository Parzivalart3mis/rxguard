// Drug side effects database for ADE detection

export const drugSideEffects = {
  lisinopril: {
    class: "ACE Inhibitor",
    side_effects: [
      { symptom: "dry cough", frequency: "very_common", pct: 12, onset: "1-6 weeks", description: "dry tickly cough" },
      { symptom: "dizziness", frequency: "common", pct: 5, onset: "days", description: "feeling dizzy or faint" },
      { symptom: "fatigue", frequency: "common", pct: 3, onset: "days-weeks", description: "feeling tired" },
      { symptom: "hyperkalemia", frequency: "common", pct: 3, onset: "weeks", description: "high potassium level" },
      { symptom: "angioedema", frequency: "rare", pct: 0.1, onset: "hours-days", description: "swelling of face, lips, or tongue" }
    ],
    renal_dosing: { threshold_egfr: 30, action: "Reduce dose to 5-10mg" }
  },
  amlodipine: {
    class: "Calcium Channel Blocker",
    side_effects: [
      { symptom: "ankle swelling", frequency: "very_common", pct: 10, onset: "1-4 weeks", description: "ankles get puffy" },
      { symptom: "dizziness", frequency: "common", pct: 3, onset: "days", description: "feeling dizzy" },
      { symptom: "flushing", frequency: "common", pct: 3, onset: "days", description: "face feels warm and red" },
      { symptom: "fatigue", frequency: "common", pct: 2, onset: "days-weeks", description: "feeling tired" },
      { symptom: "headache", frequency: "common", pct: 4, onset: "days", description: "headache" }
    ],
    renal_dosing: null
  },
  metformin: {
    class: "Biguanide",
    side_effects: [
      { symptom: "nausea", frequency: "very_common", pct: 25, onset: "days", description: "feeling sick to stomach" },
      { symptom: "diarrhea", frequency: "very_common", pct: 20, onset: "days-weeks", description: "loose stools" },
      { symptom: "abdominal pain", frequency: "common", pct: 5, onset: "days", description: "stomach cramps" },
      { symptom: "metallic taste", frequency: "common", pct: 3, onset: "days", description: "metal taste in mouth" },
      { symptom: "lactic acidosis", frequency: "rare", pct: 0.01, onset: "variable", description: "severe breathing problems" }
    ],
    renal_dosing: { threshold_egfr: 30, action: "CONTRAINDICATED below eGFR 30. Reduce to 500mg BID at eGFR 30-45." }
  },
  atorvastatin: {
    class: "Statin",
    side_effects: [
      { symptom: "muscle pain", frequency: "common", pct: 5, onset: "weeks-months", description: "muscle aches" },
      { symptom: "joint pain", frequency: "common", pct: 3, onset: "weeks", description: "joint discomfort" },
      { symptom: "fatigue", frequency: "common", pct: 2, onset: "weeks", description: "feeling tired" },
      { symptom: "nausea", frequency: "common", pct: 2, onset: "days", description: "upset stomach" },
      { symptom: "rhabdomyolysis", frequency: "rare", pct: 0.01, onset: "weeks-months", description: "severe muscle pain with dark urine" }
    ],
    renal_dosing: null
  },
  metoprolol: {
    class: "Beta Blocker",
    side_effects: [
      { symptom: "fatigue", frequency: "very_common", pct: 10, onset: "days-weeks", description: "feeling tired and low energy" },
      { symptom: "dizziness", frequency: "common", pct: 5, onset: "days", description: "lightheaded" },
      { symptom: "bradycardia", frequency: "common", pct: 3, onset: "days", description: "slow heartbeat" },
      { symptom: "cold extremities", frequency: "common", pct: 3, onset: "days-weeks", description: "cold hands and feet" },
      { symptom: "depression", frequency: "uncommon", pct: 1, onset: "weeks-months", description: "feeling down" }
    ],
    renal_dosing: null
  },
  omeprazole: {
    class: "Proton Pump Inhibitor",
    side_effects: [
      { symptom: "headache", frequency: "common", pct: 3, onset: "days", description: "headache" },
      { symptom: "nausea", frequency: "common", pct: 2, onset: "days", description: "upset stomach" },
      { symptom: "diarrhea", frequency: "common", pct: 2, onset: "days", description: "loose stools" },
      { symptom: "fatigue", frequency: "uncommon", pct: 1, onset: "weeks", description: "low energy" },
      { symptom: "vitamin_b12_deficiency", frequency: "uncommon", pct: 0.5, onset: "years", description: "numbness or tingling" }
    ],
    renal_dosing: null
  },
  furosemide: {
    class: "Loop Diuretic",
    side_effects: [
      { symptom: "hypokalemia", frequency: "very_common", pct: 15, onset: "days-weeks", description: "low potassium" },
      { symptom: "dizziness", frequency: "common", pct: 5, onset: "days", description: "lightheaded when standing" },
      { symptom: "dehydration", frequency: "common", pct: 5, onset: "days", description: "thirsty and dry mouth" },
      { symptom: "muscle cramps", frequency: "common", pct: 3, onset: "days-weeks", description: "leg cramps" },
      { symptom: "fatigue", frequency: "common", pct: 3, onset: "days", description: "weakness" }
    ],
    renal_dosing: null
  },
  sertraline: {
    class: "SSRI",
    side_effects: [
      { symptom: "nausea", frequency: "very_common", pct: 20, onset: "days", description: "stomach upset" },
      { symptom: "insomnia", frequency: "common", pct: 8, onset: "days-weeks", description: "trouble sleeping" },
      { symptom: "diarrhea", frequency: "common", pct: 6, onset: "days", description: "loose stools" },
      { symptom: "dizziness", frequency: "common", pct: 4, onset: "days", description: "dizzy" },
      { symptom: "fatigue", frequency: "common", pct: 3, onset: "days-weeks", description: "low energy" },
      { symptom: "tremor", frequency: "uncommon", pct: 1, onset: "weeks", description: "shaking hands" }
    ],
    renal_dosing: null
  },
  warfarin: {
    class: "Anticoagulant",
    side_effects: [
      { symptom: "bleeding", frequency: "common", pct: 8, onset: "variable", description: "unusual bleeding" },
      { symptom: "bruising", frequency: "common", pct: 5, onset: "days", description: "easy bruising" },
      { symptom: "nausea", frequency: "uncommon", pct: 1, onset: "days", description: "upset stomach" }
    ],
    renal_dosing: null,
    interactions_note: "Interacts with MANY drugs. Always check."
  },
  amoxicillin: {
    class: "Penicillin Antibiotic",
    side_effects: [
      { symptom: "diarrhea", frequency: "common", pct: 5, onset: "days", description: "loose stools" },
      { symptom: "nausea", frequency: "common", pct: 3, onset: "days", description: "upset stomach" },
      { symptom: "rash", frequency: "common", pct: 3, onset: "days", description: "skin rash" }
    ],
    renal_dosing: { threshold_egfr: 30, action: "Extend dosing interval to q12h or q24h" }
  },
  nitrofurantoin: {
    class: "Nitrofuran Antibiotic",
    side_effects: [
      { symptom: "nausea", frequency: "common", pct: 8, onset: "days", description: "stomach upset" },
      { symptom: "headache", frequency: "common", pct: 3, onset: "days", description: "headache" }
    ],
    renal_dosing: { threshold_egfr: 30, action: "AVOID — ineffective and risk of peripheral neuropathy at eGFR <30" }
  },
  ibuprofen: {
    class: "NSAID",
    side_effects: [
      { symptom: "GI upset", frequency: "common", pct: 10, onset: "days", description: "stomach pain" },
      { symptom: "hypertension", frequency: "common", pct: 5, onset: "weeks", description: "high blood pressure" },
      { symptom: "kidney injury", frequency: "uncommon", pct: 1, onset: "days-weeks", description: "reduced urination" },
      { symptom: "GI bleeding", frequency: "uncommon", pct: 1, onset: "weeks-months", description: "blood in stool or vomit" }
    ],
    renal_dosing: { threshold_egfr: 30, action: "AVOID in CKD — nephrotoxic risk" }
  },
  potassium_chloride: {
    class: "Electrolyte Supplement",
    side_effects: [
      { symptom: "GI upset", frequency: "common", pct: 5, onset: "days", description: "stomach discomfort" },
      { symptom: "nausea", frequency: "common", pct: 3, onset: "days", description: "upset stomach" }
    ],
    renal_dosing: null
  },
  azithromycin: {
    class: "Macrolide Antibiotic",
    side_effects: [
      { symptom: "nausea", frequency: "common", pct: 4, onset: "days", description: "stomach upset" },
      { symptom: "diarrhea", frequency: "common", pct: 4, onset: "days", description: "loose stools" },
      { symptom: "abdominal pain", frequency: "common", pct: 2, onset: "days", description: "stomach cramps" }
    ],
    renal_dosing: null
  },
  birth_control: {
    class: "Hormonal Contraceptive",
    side_effects: [
      { symptom: "nausea", frequency: "common", pct: 10, onset: "days", description: "morning sickness feeling" },
      { symptom: "headache", frequency: "common", pct: 8, onset: "days", description: "headache" },
      { symptom: "breast tenderness", frequency: "common", pct: 5, onset: "days", description: "tender breasts" }
    ],
    renal_dosing: null
  }
};

export default drugSideEffects;
