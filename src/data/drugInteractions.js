// Drug-drug interaction database

export const drugInteractions = [
  {
    drug_a: "warfarin",
    drug_b: "amoxicillin",
    severity: "moderate",
    effect: "Amoxicillin may increase INR/bleeding risk with warfarin",
    action: "Monitor INR closely. Check INR 3-5 days after starting antibiotic.",
    mechanism: "Disruption of gut flora reduces vitamin K synthesis"
  },
  {
    drug_a: "warfarin",
    drug_b: "tmp_smx",
    severity: "major",
    effect: "TMP-SMX significantly increases warfarin levels — high bleeding risk",
    action: "Avoid combination if possible. If necessary, reduce warfarin dose and monitor INR every 2-3 days.",
    mechanism: "TMP-SMX displaces warfarin from protein binding and inhibits metabolism"
  },
  {
    drug_a: "atorvastatin",
    drug_b: "clarithromycin",
    severity: "major",
    effect: "Clarithromycin inhibits CYP3A4, greatly increasing statin levels — rhabdomyolysis risk",
    action: "Hold statin during clarithromycin course, or switch to azithromycin.",
    mechanism: "CYP3A4 inhibition"
  },
  {
    drug_a: "lisinopril",
    drug_b: "potassium_chloride",
    severity: "moderate",
    effect: "ACE inhibitors reduce potassium excretion. Combined with K+ supplement → hyperkalemia risk",
    action: "Monitor potassium levels within 1 week. Avoid if K+ already >5.0.",
    mechanism: "Additive hyperkalemia risk"
  },
  {
    drug_a: "metformin",
    drug_b: "ibuprofen",
    severity: "moderate",
    effect: "NSAIDs can reduce kidney function, increasing metformin accumulation and lactic acidosis risk",
    action: "Avoid long-term NSAID use with metformin, especially if eGFR <60.",
    mechanism: "Nephrotoxicity reducing metformin clearance"
  },
  {
    drug_a: "sertraline",
    drug_b: "ibuprofen",
    severity: "moderate",
    effect: "SSRI + NSAID increases GI bleeding risk (both affect platelet function)",
    action: "Consider adding PPI for GI protection if combination is necessary.",
    mechanism: "Additive effect on platelet function and gastric protection"
  },
  {
    drug_a: "furosemide",
    drug_b: "lisinopril",
    severity: "minor",
    effect: "First-dose hypotension risk when combining ACE inhibitor with diuretic",
    action: "Start ACE inhibitor at low dose. Monitor blood pressure.",
    mechanism: "Additive hypotensive effect"
  },
  {
    drug_a: "warfarin",
    drug_b: "azithromycin",
    severity: "moderate",
    effect: "Macrolides may increase warfarin effect",
    action: "Monitor INR 3-5 days after starting macrolide.",
    mechanism: "Variable effect on gut flora"
  },
  {
    drug_a: "metformin",
    drug_b: "furosemide",
    severity: "moderate",
    effect: "Diuretics can worsen kidney function, increasing lactic acidosis risk with metformin",
    action: "Monitor kidney function if diuretic dose increased. Hold metformin if acute kidney injury.",
    mechanism: "Reduced metformin clearance"
  },
  {
    drug_a: "lisinopril",
    drug_b: "furosemide",
    severity: "moderate",
    effect: "Risk of hypotension, especially with high doses",
    action: "Monitor blood pressure. Consider holding furosemide on day 1 of ACE inhibitor.",
    mechanism: "Additive hypotensive effect"
  },
  {
    drug_a: "metoprolol",
    drug_b: "furosemide",
    severity: "moderate",
    effect: "Risk of hypotension and electrolyte abnormalities",
    action: "Monitor blood pressure and potassium levels.",
    mechanism: "Additive hypotensive effect"
  },
  {
    drug_a: "potassium_chloride",
    drug_b: "furosemide",
    severity: "minor",
    effect: "Furosemide causes potassium loss, KCl replaces it — therapeutic combination",
    action: "Monitor potassium. May indicate prescribing cascade.",
    mechanism: "Therapeutic interaction — intentional"
  },
  {
    drug_a: "omeprazole",
    drug_b: "clopidogrel",
    severity: "minor",
    effect: "Omeprazole reduces clopidogrel efficacy",
    action: "Consider pantoprazole instead if using PPI.",
    mechanism: "CYP2C19 inhibition"
  },

  // Antibiotic-specific interactions (relevant to prescribe tab)
  {
    drug_a: "warfarin",
    drug_b: "ciprofloxacin",
    severity: "moderate",
    effect: "Ciprofloxacin can increase warfarin levels — elevated bleeding risk",
    action: "Monitor INR closely within 3-5 days of starting ciprofloxacin. Consider dose reduction.",
    mechanism: "Inhibition of warfarin metabolism via CYP1A2 and gut flora disruption"
  },
  {
    drug_a: "warfarin",
    drug_b: "levofloxacin",
    severity: "moderate",
    effect: "Levofloxacin may potentiate warfarin anticoagulation — bleeding risk",
    action: "Check INR 3-5 days after starting levofloxacin. Avoid if INR already supratherapeutic.",
    mechanism: "Reduced vitamin K synthesis from gut flora disruption"
  },
  {
    drug_a: "atorvastatin",
    drug_b: "azithromycin",
    severity: "moderate",
    effect: "Azithromycin (macrolide) can increase atorvastatin levels — myopathy risk",
    action: "Use with caution. Monitor for muscle pain/weakness. Consider doxycycline or amoxicillin if statin dose is high.",
    mechanism: "Moderate CYP3A4 inhibition by azithromycin increases statin exposure"
  },
  {
    drug_a: "metformin",
    drug_b: "ciprofloxacin",
    severity: "moderate",
    effect: "Ciprofloxacin can cause unpredictable blood glucose changes (both hypo- and hyperglycemia) in patients on metformin",
    action: "Warn patient to monitor blood glucose closely during fluoroquinolone course.",
    mechanism: "Fluoroquinolones stimulate insulin secretion and alter glucose homeostasis"
  },
  {
    drug_a: "ciprofloxacin",
    drug_b: "glipizide",
    severity: "major",
    effect: "Fluoroquinolones combined with sulfonylureas can cause severe hypoglycemia or hyperglycemia",
    action: "Avoid ciprofloxacin if possible. If used, monitor blood glucose frequently and warn patient of hypoglycemia symptoms.",
    mechanism: "Ciprofloxacin stimulates pancreatic insulin release, unpredictably amplifying sulfonylurea effect"
  },
  {
    drug_a: "warfarin",
    drug_b: "doxycycline",
    severity: "moderate",
    effect: "Doxycycline may enhance anticoagulant effect of warfarin",
    action: "Monitor INR 3-5 days after starting doxycycline.",
    mechanism: "Gut flora disruption reduces vitamin K synthesis"
  }
];

export default drugInteractions;
