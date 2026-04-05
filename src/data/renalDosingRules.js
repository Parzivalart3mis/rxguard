// Renal dosing rules database

export const renalDosingRules = {
  metformin: {
    drug: "Metformin",
    class: "Biguanide",
    requirements: [
      {
        egfr_threshold: 30,
        action: "CONTRAINDICATED",
        message: "Metformin is contraindicated at eGFR <30 due to lactic acidosis risk. Discontinue or switch to alternative.",
        severity: "major",
        recommended_drug: "insulin glargine",
        recommended_dose: "10 units",
        recommended_frequency: "once daily at bedtime"
      },
      {
        egfr_threshold: 45,
        action: "REDUCE DOSE",
        message: "Reduce metformin dose to 500mg BID at eGFR 30-45. Monitor kidney function closely.",
        severity: "moderate",
        recommended_drug: "metformin",
        recommended_dose: "500mg",
        recommended_frequency: "twice daily"
      }
    ]
  },
  nitrofurantoin: {
    drug: "Nitrofurantoin",
    class: "Antibiotic",
    requirements: [
      {
        egfr_threshold: 30,
        action: "AVOID",
        message: "Nitrofurantoin is ineffective and potentially harmful at eGFR <30. Risk of peripheral neuropathy. Choose alternative antibiotic.",
        severity: "major",
        recommended_drug: "trimethoprim-sulfamethoxazole",
        recommended_dose: "80/400mg",
        recommended_frequency: "twice daily"
      }
    ]
  },
  amoxicillin: {
    drug: "Amoxicillin",
    class: "Antibiotic",
    requirements: [
      {
        egfr_threshold: 30,
        action: "EXTEND INTERVAL",
        message: "Extend amoxicillin dosing interval to q12h or q24h at eGFR <30.",
        severity: "minor",
        recommended_drug: "amoxicillin",
        recommended_dose: "500mg",
        recommended_frequency: "every 12–24 hours"
      }
    ]
  },
  lisinopril: {
    drug: "Lisinopril",
    class: "ACE Inhibitor",
    requirements: [
      {
        egfr_threshold: 30,
        action: "REDUCE DOSE",
        message: "Consider reducing lisinopril dose to 5-10mg daily at eGFR <30. Monitor potassium and creatinine.",
        severity: "moderate",
        recommended_drug: "lisinopril",
        recommended_dose: "5mg",
        recommended_frequency: "once daily"
      }
    ]
  },
  ibuprofen: {
    drug: "Ibuprofen",
    class: "NSAID",
    requirements: [
      {
        egfr_threshold: 30,
        action: "AVOID",
        message: "Avoid NSAIDs in CKD (eGFR <30) — nephrotoxic risk. Consider acetaminophen or topical alternatives.",
        severity: "major",
        recommended_drug: "acetaminophen",
        recommended_dose: "500mg",
        recommended_frequency: "every 6 hours as needed"
      },
      {
        egfr_threshold: 60,
        action: "USE CAUTION",
        message: "Use NSAIDs with caution at eGFR 30-60. Monitor kidney function and avoid prolonged use.",
        severity: "moderate",
        recommended_drug: "ibuprofen",
        recommended_dose: "400mg",
        recommended_frequency: "every 8 hours with food"
      }
    ]
  },
  furosemide: {
    drug: "Furosemide",
    class: "Loop Diuretic",
    requirements: [
      {
        egfr_threshold: 30,
        action: "HIGH DOSE MAY BE NEEDED",
        message: "At eGFR <30, higher furosemide doses may be needed due to reduced tubular secretion. Monitor response closely.",
        severity: "minor",
        recommended_drug: "furosemide",
        recommended_dose: "80mg",
        recommended_frequency: "twice daily"
      }
    ]
  },
  gabapentin: {
    drug: "Gabapentin",
    class: "Neuropathic Pain Agent",
    requirements: [
      {
        egfr_threshold: 30,
        action: "REDUCE DOSE",
        message: "Reduce gabapentin dose by 50% at eGFR <30. Renally cleared.",
        severity: "moderate",
        recommended_drug: "gabapentin",
        recommended_dose: "100–300mg",
        recommended_frequency: "once daily or every 12 hours"
      }
    ]
  },
  enoxaparin: {
    drug: "Enoxaparin",
    class: "Low Molecular Weight Heparin",
    requirements: [
      {
        egfr_threshold: 30,
        action: "AVOID OR DOSE REDUCE",
        message: "Consider unfractionated heparin or dose reduction at eGFR <30 due to accumulation risk.",
        severity: "major",
        recommended_drug: "unfractionated heparin",
        recommended_dose: "5000 units",
        recommended_frequency: "every 8–12 hours subcutaneous"
      }
    ]
  }
};

export default renalDosingRules;
