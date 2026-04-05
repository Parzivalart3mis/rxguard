/**
 * Cascade detector — server-side version.
 *
 * Identical logic to src/services/cascadeDetector.js but
 * cascadePatternsData is injected as a parameter.
 */

const normalizeDrugClass = (drugName) => {
  const mappings = {
    amlodipine:         'Calcium Channel Blocker',
    furosemide:         'Loop Diuretic',
    potassium_chloride: 'Potassium Supplement',
    atorvastatin:       'Statin',
    ibuprofen:          'NSAID',
    omeprazole:         'PPI',
    lisinopril:         'ACE Inhibitor',
    sertraline:         'SSRI',
    donepezil:          'Cholinesterase Inhibitor',
    oxybutynin:         'Anticholinergic',
  };
  return mappings[drugName] || drugName;
};

const matchesDrugClass = (med, drugClass) => {
  const medClass   = normalizeDrugClass(med.drug);
  const targetClass = drugClass.toLowerCase();
  return (
    medClass.toLowerCase().includes(targetClass) ||
    targetClass.includes(medClass.toLowerCase()) ||
    med.drug.toLowerCase().includes(targetClass.replace(' ', ''))
  );
};

export const detectCascades = (patient, cascadePatternsData) => {
  const allMeds = [...patient.continuingMeds, ...patient.newMeds];
  const detectedCascades = [];

  for (const pattern of cascadePatternsData) {
    const chainMatches = [];
    let chainIndex = 0;

    for (const chainStep of pattern.chain) {
      const matchingMed = allMeds.find(
        (med) =>
          matchesDrugClass(med, chainStep.drug_class) ||
          med.drug === chainStep.example
      );

      if (matchingMed) {
        chainMatches.push({ step: chainStep, medication: matchingMed, index: chainIndex });
        chainIndex++;
      } else {
        break;
      }
    }

    if (chainMatches.length >= 2) {
      detectedCascades.push({
        pattern,
        matches: chainMatches,
        medications: chainMatches.map((m) => m.medication),
        severity:      pattern.risk_level,
        pillReduction: pattern.pill_reduction,
        resolution:    pattern.resolution,
      });
    }
  }

  const severityOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
  detectedCascades.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  return detectedCascades;
};

export const analyzeCascade = (cascade, patient) => {
  const { pattern, matches } = cascade;

  const nodes = matches.map((match, index) => ({
    id:           `node-${index}`,
    medication:   match.medication,
    drugClass:    match.step.drug_class,
    causes:       match.step.causes,
    causesSymptom: match.step.causes_symptom,
    treats:       match.step.treats,
    treatsSymptom: match.step.treats_symptom,
    isStarter:    index === 0,
    isTerminal:   index === matches.length - 1,
  }));

  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ from: nodes[i].id, to: nodes[i + 1].id, label: nodes[i].causes, type: 'causes' });
    edges.push({ from: nodes[i + 1].id, to: nodes[i].id, label: 'treats', type: 'treats' });
  }

  const relevantSymptoms = patient.symptoms.filter((symptom) =>
    nodes.some(
      (node) =>
        node.causesSymptom &&
        symptom.symptom.toLowerCase().includes(node.causesSymptom.toLowerCase())
    )
  );

  return {
    cascadeName:       pattern.name,
    description:       pattern.description,
    nodes,
    edges,
    relevantSymptoms,
    pillReduction:     pattern.pill_reduction,
    resolution:        pattern.resolution,
    riskLevel:         pattern.risk_level,
    savingsPotential:  pattern.savings_potential,
  };
};
