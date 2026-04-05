/**
 * Drug-drug interaction checker — server-side version.
 *
 * All interaction data comes from the drug_interactions table (seeded + RxNav).
 * The former checkClassInteractions() has been removed — those patterns are now
 * covered by the RxNav sync in interactionFetcher.js.
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

