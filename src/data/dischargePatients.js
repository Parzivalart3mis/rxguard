// Discharge patient scenarios for RxGuard+

export const dischargePatients = [
  {
    id: 1,
    name: "John Miller",
    age: 34,
    sex: "male",
    weight: 78,
    demo: "Antibiotic stewardship: doesn't need antibiotic for viral sore throat",
    
    continuingMeds: [],
    newMeds: [
      { drug: "azithromycin", dose: "500mg", frequency: "once daily", duration: "5 days", startDate: "2025-04-02", reason: "Sore throat - viral URI suspected" }
    ],
    stoppedMeds: [],
    
    labs: {
      egfr: 105,
      creatinine: 0.9,
      potassium: 4.1,
      wbc: 7.2,
      hemoglobin: 14.5
    },
    
    symptoms: [
      { symptom: "sore throat", onset: "2025-04-01", severity: "moderate", description: "Scratchy throat, no fever" }
    ],
    
    allergies: [],
    conditions: ["viral URI"],
    
    vitalSigns: {
      temperature: 37.1,
      heartRate: 72,
      bloodPressure: "118/76"
    },
    
    dischargeDate: "2025-04-02",
    admissionDate: "2025-04-02"
  },
  
  {
    id: 2,
    name: "Sarah Chen",
    age: 28,
    sex: "female",
    weight: 62,
    demo: "UTI: correct narrow-spectrum antibiotic pick",
    
    continuingMeds: [
      { drug: "birth_control", dose: "1 tablet", frequency: "daily", startDate: "2024-06-01", reason: "Contraception" }
    ],
    newMeds: [
      { drug: "nitrofurantoin", dose: "100mg", frequency: "twice daily", duration: "5 days", startDate: "2025-04-02", reason: "Uncomplicated UTI" }
    ],
    stoppedMeds: [],
    
    labs: {
      egfr: 98,
      creatinine: 0.8,
      potassium: 4.0,
      wbc: 9.5,
      hemoglobin: 13.2,
      urine_nitrites: "positive",
      urine_wbc: "elevated"
    },
    
    symptoms: [
      { symptom: "dysuria", onset: "2025-04-01", severity: "severe", description: "Burning with urination" },
      { symptom: "urinary frequency", onset: "2025-04-01", severity: "moderate", description: "Going every hour" }
    ],
    
    allergies: [],
    conditions: ["uncomplicated UTI"],
    
    vitalSigns: {
      temperature: 37.4,
      heartRate: 88,
      bloodPressure: "112/74"
    },
    
    dischargeDate: "2025-04-02",
    admissionDate: "2025-04-02"
  },
  
  {
    id: 3,
    name: "Robert Johnson",
    age: 67,
    sex: "male",
    weight: 82,
    demo: "Pneumonia: appropriate antibiotic + renal dose check",
    
    continuingMeds: [
      { drug: "metformin", dose: "1000mg", frequency: "twice daily", startDate: "2023-01-15", reason: "Type 2 diabetes" },
      { drug: "lisinopril", dose: "20mg", frequency: "daily", startDate: "2023-01-15", reason: "Hypertension" },
      { drug: "atorvastatin", dose: "40mg", frequency: "daily", startDate: "2023-01-15", reason: "High cholesterol" }
    ],
    newMeds: [
      { drug: "amoxicillin", dose: "875mg", frequency: "twice daily", duration: "7 days", startDate: "2025-04-01", reason: "Community-acquired pneumonia" }
    ],
    stoppedMeds: [],
    
    labs: {
      egfr: 55,
      creatinine: 1.2,
      potassium: 4.3,
      wbc: 12.8,
      hemoglobin: 13.8,
      procalcitonin: 0.8
    },
    
    symptoms: [
      { symptom: "productive cough", onset: "2025-03-30", severity: "severe", description: "Yellow-green sputum" },
      { symptom: "fever", onset: "2025-03-30", severity: "moderate", description: "Temperature 38.5°C" },
      { symptom: "dyspnea", onset: "2025-03-31", severity: "moderate", description: "Shortness of breath on exertion" }
    ],
    
    allergies: [],
    conditions: ["community_acquired_pneumonia", "type_2_diabetes", "hypertension"],
    
    vitalSigns: {
      temperature: 38.2,
      heartRate: 96,
      bloodPressure: "134/82",
      respiratoryRate: 22,
      oxygenSaturation: 94
    },
    
    imaging: {
      chest_xray: "Right lower lobe infiltrate"
    },
    
    dischargeDate: "2025-04-03",
    admissionDate: "2025-04-01"
  },
  
  {
    id: 4,
    name: "Margaret Thompson",
    age: 74,
    sex: "female",
    weight: 68,
    demo: "⭐ LEAD DEMO: Prescribing cascade (amlodipine → edema → furosemide → hypoK → KCl). 3 meds → 1.",
    
    continuingMeds: [
      { drug: "amlodipine", dose: "10mg", frequency: "daily", startDate: "2025-01-10", reason: "Hypertension" },
      { drug: "furosemide", dose: "40mg", frequency: "daily", startDate: "2025-03-15", reason: "Edema from amlodipine" },
      { drug: "potassium_chloride", dose: "20mEq", frequency: "daily", startDate: "2025-03-20", reason: "Hypokalemia from furosemide" },
      { drug: "metoprolol", dose: "50mg", frequency: "twice daily", startDate: "2024-08-01", reason: "Hypertension" }
    ],
    newMeds: [],
    stoppedMeds: [],
    
    labs: {
      egfr: 62,
      creatinine: 1.0,
      potassium: 3.2,
      sodium: 138,
      wbc: 7.8,
      hemoglobin: 12.1
    },
    
    symptoms: [
      { symptom: "fatigue", onset: "2025-03-20", severity: "moderate", description: "Tired all the time" },
      { symptom: "ankle swelling", onset: "2025-02-01", severity: "moderate", description: "Both ankles puffy by evening" }
    ],
    
    allergies: [],
    conditions: ["hypertension", "medication_induced_edema"],
    
    vitalSigns: {
      temperature: 36.8,
      heartRate: 68,
      bloodPressure: "142/88"
    },
    
    dischargeDate: "2025-04-04",
    admissionDate: "2025-04-02"
  },
  
  {
    id: 5,
    name: "Michael Brown",
    age: 45,
    sex: "male",
    weight: 85,
    demo: "Viral URI: antibiotic not needed",
    
    continuingMeds: [
      { drug: "omeprazole", dose: "20mg", frequency: "daily", startDate: "2023-03-01", reason: "GERD" },
      { drug: "sertraline", dose: "50mg", frequency: "daily", startDate: "2024-01-15", reason: "Anxiety" }
    ],
    newMeds: [
      { drug: "azithromycin", dose: "500mg", frequency: "once daily", duration: "5 days", startDate: "2025-04-02", reason: "URI symptoms" }
    ],
    stoppedMeds: [],
    
    labs: {
      egfr: 92,
      creatinine: 0.9,
      potassium: 4.2,
      wbc: 6.5,
      hemoglobin: 14.8
    },
    
    symptoms: [
      { symptom: "cough", onset: "2025-04-01", severity: "moderate", description: "Dry cough, worse at night" },
      { symptom: "low grade fever", onset: "2025-04-01", severity: "mild", description: "Temperature 37.8°C" }
    ],
    
    allergies: [],
    conditions: ["viral URI", "GERD", "anxiety"],
    
    vitalSigns: {
      temperature: 37.8,
      heartRate: 78,
      bloodPressure: "128/78"
    },
    
    dischargeDate: "2025-04-02",
    admissionDate: "2025-04-02"
  },
  
  {
    id: 6,
    name: "Harold Kim",
    age: 71,
    sex: "male",
    weight: 75,
    demo: "ADE: cough from ACE inhibitor + metformin dose concern for eGFR 48",
    
    continuingMeds: [
      { drug: "lisinopril", dose: "20mg", frequency: "daily", startDate: "2025-03-10", reason: "Hypertension" },
      { drug: "atorvastatin", dose: "40mg", frequency: "daily", startDate: "2022-06-01", reason: "High cholesterol" },
      { drug: "metformin", dose: "1000mg", frequency: "twice daily", startDate: "2022-06-01", reason: "Type 2 diabetes" }
    ],
    newMeds: [],
    stoppedMeds: [],
    
    labs: {
      egfr: 48,
      creatinine: 1.4,
      potassium: 4.5,
      wbc: 7.5,
      hemoglobin: 13.2
    },
    
    symptoms: [
      { symptom: "dry cough", onset: "2025-03-20", severity: "moderate", description: "Persistent dry tickly cough, worse at night" }
    ],
    
    allergies: [],
    conditions: ["hypertension", "type_2_diabetes", "ACE_inhibitor_induced_cough"],
    
    vitalSigns: {
      temperature: 36.6,
      heartRate: 72,
      bloodPressure: "138/84"
    },
    
    dischargeDate: "2025-04-03",
    admissionDate: "2025-04-01"
  },
  
  {
    id: 7,
    name: "James Wilson",
    age: 72,
    sex: "male",
    weight: 80,
    demo: "Renal dosing crisis: metformin contraindicated at eGFR 25 + antibiotic-warfarin interaction risk",
    
    continuingMeds: [
      { drug: "metformin", dose: "1000mg", frequency: "twice daily", startDate: "2021-03-01", reason: "Type 2 diabetes" },
      { drug: "warfarin", dose: "5mg", frequency: "daily", startDate: "2022-01-15", reason: "Atrial fibrillation" },
      { drug: "amlodipine", dose: "5mg", frequency: "daily", startDate: "2023-06-01", reason: "Hypertension" }
    ],
    newMeds: [
      { drug: "amoxicillin", dose: "500mg", frequency: "three times daily", duration: "7 days", startDate: "2025-04-02", reason: "UTI" }
    ],
    stoppedMeds: [],
    
    labs: {
      egfr: 25,
      creatinine: 2.1,
      potassium: 4.8,
      wbc: 11.2,
      hemoglobin: 11.8,
      inr: 2.8,
      urine_nitrites: "positive"
    },
    
    symptoms: [
      { symptom: "dysuria", onset: "2025-04-01", severity: "severe", description: "Burning with urination" },
      { symptom: "urinary frequency", onset: "2025-04-01", severity: "severe", description: "Going every 30 minutes" },
      { symptom: "fatigue", onset: "2025-03-01", severity: "moderate", description: "Increasing tiredness" }
    ],
    
    allergies: [],
    conditions: ["complicated_uti", "atrial_fibrillation", "CKD_stage_4", "type_2_diabetes"],
    
    vitalSigns: {
      temperature: 37.9,
      heartRate: 88,
      bloodPressure: "148/92"
    },
    
    dischargeDate: "2025-04-03",
    admissionDate: "2025-04-02"
  },
  
  {
    id: 8,
    name: "Dorothy Garcia",
    age: 78,
    sex: "female",
    weight: 64,
    demo: "Statin → pain → NSAID → GI → PPI cascade",
    
    continuingMeds: [
      { drug: "atorvastatin", dose: "40mg", frequency: "daily", startDate: "2023-01-15", reason: "High cholesterol" },
      { drug: "ibuprofen", dose: "400mg", frequency: "three times daily as needed", startDate: "2025-02-01", reason: "Muscle pain from statin" },
      { drug: "omeprazole", dose: "20mg", frequency: "daily", startDate: "2025-03-01", reason: "Stomach upset from ibuprofen" }
    ],
    newMeds: [],
    stoppedMeds: [],
    
    labs: {
      egfr: 45,
      creatinine: 1.3,
      potassium: 4.1,
      wbc: 6.8,
      hemoglobin: 12.8,
      ck: 180
    },
    
    symptoms: [
      { symptom: "muscle pain", onset: "2025-01-15", severity: "moderate", description: "Leg muscle aches" },
      { symptom: "GI upset", onset: "2025-02-15", severity: "mild", description: "Stomach discomfort after ibuprofen" }
    ],
    
    allergies: [],
    conditions: ["hyperlipidemia", "statin_induced_myalgia"],
    
    vitalSigns: {
      temperature: 36.7,
      heartRate: 76,
      bloodPressure: "136/82"
    },
    
    dischargeDate: "2025-04-03",
    admissionDate: "2025-04-01"
  },
  
  {
    id: 9,
    name: "David Lee",
    age: 30,
    sex: "male",
    weight: 70,
    demo: "Clean antibiotic case: narrow spectrum pick",
    
    continuingMeds: [],
    newMeds: [
      { drug: "cephalexin", dose: "500mg", frequency: "four times daily", duration: "7 days", startDate: "2025-04-02", reason: "Cellulitis right lower leg" }
    ],
    stoppedMeds: [],
    
    labs: {
      egfr: 110,
      creatinine: 0.8,
      potassium: 4.0,
      wbc: 10.5,
      hemoglobin: 14.2
    },
    
    symptoms: [
      { symptom: "cellulitis", onset: "2025-04-01", severity: "moderate", description: "Red, warm, tender area on right shin, 5x5cm" }
    ],
    
    allergies: [
      { substance: "Penicillin", reaction: "rash" }
    ],
    conditions: ["cellulitis"],
    
    vitalSigns: {
      temperature: 37.6,
      heartRate: 84,
      bloodPressure: "122/78"
    },
    
    dischargeDate: "2025-04-02",
    admissionDate: "2025-04-02"
  },
  
  {
    id: 10,
    name: "Eleanor Patel",
    age: 68,
    sex: "female",
    weight: 58,
    demo: "Polypharmacy: 3 symptoms explainable by multiple drugs. System ranks. Renal concern for metformin.",
    
    continuingMeds: [
      { drug: "metformin", dose: "1000mg", frequency: "twice daily", startDate: "2020-01-01", reason: "Type 2 diabetes" },
      { drug: "metoprolol", dose: "50mg", frequency: "twice daily", startDate: "2022-03-01", reason: "Hypertension" },
      { drug: "sertraline", dose: "100mg", frequency: "daily", startDate: "2023-06-01", reason: "Depression" },
      { drug: "omeprazole", dose: "20mg", frequency: "daily", startDate: "2024-01-01", reason: "GERD" },
      { drug: "furosemide", dose: "20mg", frequency: "daily", startDate: "2024-06-01", reason: "Edema" },
      { drug: "potassium_chloride", dose: "10mEq", frequency: "daily", startDate: "2024-07-01", reason: "Hypokalemia from diuretic" }
    ],
    newMeds: [],
    stoppedMeds: [],
    
    labs: {
      egfr: 38,
      creatinine: 1.6,
      potassium: 3.5,
      sodium: 138,
      wbc: 7.0,
      hemoglobin: 11.5
    },
    
    symptoms: [
      { symptom: "fatigue", onset: "2024-12-01", severity: "moderate", description: "Always tired, low energy" },
      { symptom: "dizziness", onset: "2025-01-01", severity: "moderate", description: "Lightheaded on standing" },
      { symptom: "nausea", onset: "2025-02-01", severity: "mild", description: "Queasy in mornings" }
    ],
    
    allergies: [],
    conditions: ["type_2_diabetes", "hypertension", "depression", "GERD", "CKD_stage_3b"],
    
    vitalSigns: {
      temperature: 36.5,
      heartRate: 64,
      bloodPressure: "128/76"
    },
    
    dischargeDate: "2025-04-03",
    admissionDate: "2025-04-01"
  }
];

export default dischargePatients;
