/**
 * Drug-drug interaction checker — server-side version.
 *
 * Identical logic to src/services/interactionChecker.js but
 * data is injected as a parameter instead of statically imported.
 */

export const checkAllInteractions = (patient, drugInteractionsData) => {
  const allMeds = [...patient.continuingMeds, ...patient.newMeds];
  const interactions = [];
  const checkedPairs = new Set();

  for (let i = 0; i < allMeds.length; i++) {
    for (let j = i + 1; j < allMeds.length; j++) {
      const med1 = allMeds[i];
      const med2 = allMeds[j];

      const pairId = [med1.drug, med2.drug].sort().join('-');
      if (checkedPairs.has(pairId)) continue;
      checkedPairs.add(pairId);

      const interaction = drugInteractionsData.find(
        (i) =>
          (i.drug_a === med1.drug && i.drug_b === med2.drug) ||
          (i.drug_a === med2.drug && i.drug_b === med1.drug)
      );

      if (interaction) {
        const isMed1New = patient.newMeds.some((m) => m.drug === med1.drug);
        const isMed2New = patient.newMeds.some((m) => m.drug === med2.drug);

        interactions.push({
          ...interaction,
          drug1: med1,
          drug2: med2,
          drug1IsNew: isMed1New,
          drug2IsNew: isMed2New,
          bothContinuing: !isMed1New && !isMed2New,
          hasNewDrug: isMed1New || isMed2New,
        });
      }
    }
  }

  const severityOrder = { major: 0, moderate: 1, minor: 2 };
  interactions.sort((a, b) => {
    if (a.hasNewDrug && !b.hasNewDrug) return -1;
    if (!a.hasNewDrug && b.hasNewDrug) return 1;
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return interactions;
};

export const checkClassInteractions = (patient) => {
  const allMeds = [...patient.continuingMeds, ...patient.newMeds];
  const classAlerts = [];

  const hasAnticoagulant = allMeds.some((m) => m.drug === 'warfarin');
  const hasAntibiotic = allMeds.some((m) =>
    ['amoxicillin', 'azithromycin', 'tmp_smx', 'ciprofloxacin'].includes(m.drug)
  );

  if (hasAnticoagulant && hasAntibiotic) {
    const antibiotic = allMeds.find((m) =>
      ['amoxicillin', 'azithromycin', 'tmp_smx', 'ciprofloxacin'].includes(m.drug)
    );
    classAlerts.push({
      type: 'anticoagulant_antibiotic',
      severity: 'major',
      title: 'Anticoagulant + Antibiotic Interaction',
      description: `Warfarin + ${antibiotic.drug} increases bleeding risk`,
      action: 'Check INR 3-5 days after starting antibiotic. Consider antibiotic alternative.',
      medications: ['warfarin', antibiotic.drug],
    });
  }

  const hasNSAID  = allMeds.some((m) => m.drug === 'ibuprofen');
  const hasACEI   = allMeds.some((m) => m.drug === 'lisinopril');
  const hasDiuretic = allMeds.some((m) => m.drug === 'furosemide');

  if (hasNSAID && (hasACEI || hasDiuretic)) {
    classAlerts.push({
      type: 'nsaid_renal',
      severity: 'major',
      title: 'NSAID + ACEI/Diuretic Triple Whammy',
      description: 'NSAID + ACE inhibitor + Diuretic increases acute kidney injury risk',
      action: 'Avoid this combination if possible. Monitor kidney function closely.',
      medications: ['ibuprofen', 'lisinopril', 'furosemide'].filter((d) =>
        allMeds.some((m) => m.drug === d)
      ),
    });
  }

  const hasSSRI = allMeds.some((m) => m.drug === 'sertraline');
  if (hasSSRI && hasNSAID) {
    classAlerts.push({
      type: 'ssri_nsaid_bleeding',
      severity: 'moderate',
      title: 'SSRI + NSAID GI Bleeding Risk',
      description: 'Combining SSRI and NSAID increases risk of gastrointestinal bleeding',
      action: 'Consider adding PPI protection or switching pain medication.',
      medications: ['sertraline', 'ibuprofen'],
    });
  }

  return classAlerts;
};
