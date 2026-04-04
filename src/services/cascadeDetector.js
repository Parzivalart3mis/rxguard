// Prescribing Cascade Detector
// Identifies medication chains where one drug causes side effects treated by another

import { cascadePatterns } from '../data/cascadePatterns.js';

/**
 * Normalize drug class names for comparison
 */
const normalizeDrugClass = (drugName) => {
  const mappings = {
    'amlodipine': 'Calcium Channel Blocker',
    'furosemide': 'Loop Diuretic',
    'potassium_chloride': 'Potassium Supplement',
    'atorvastatin': 'Statin',
    'ibuprofen': 'NSAID',
    'omeprazole': 'PPI',
    'lisinopril': 'ACE Inhibitor',
    'sertraline': 'SSRI',
    'donepezil': 'Cholinesterase Inhibitor',
    'oxybutynin': 'Anticholinergic'
  };
  
  return mappings[drugName] || drugName;
};

/**
 * Check if a medication matches a drug class
 */
const matchesDrugClass = (med, drugClass) => {
  const medClass = normalizeDrugClass(med.drug);
  const targetClass = drugClass.toLowerCase();
  
  return medClass.toLowerCase().includes(targetClass) ||
         targetClass.includes(medClass.toLowerCase()) ||
         med.drug.toLowerCase().includes(targetClass.replace(' ', ''));
};

/**
 * Find cascade patterns in patient's medication list
 */
export const detectCascades = (patient) => {
  const allMeds = [...patient.continuingMeds, ...patient.newMeds];
  const detectedCascades = [];
  
  for (const pattern of cascadePatterns) {
    const chainMatches = [];
    let chainIndex = 0;
    
    // Try to match the full chain
    for (const chainStep of pattern.chain) {
      // Find a medication that matches this step
      const matchingMed = allMeds.find(med => 
        matchesDrugClass(med, chainStep.drug_class) ||
        med.drug === chainStep.example
      );
      
      if (matchingMed) {
        chainMatches.push({
          step: chainStep,
          medication: matchingMed,
          index: chainIndex
        });
        chainIndex++;
      } else {
        // Chain broken
        break;
      }
    }
    
    // If we matched at least 2 steps, it's a cascade
    if (chainMatches.length >= 2) {
      detectedCascades.push({
        pattern: pattern,
        matches: chainMatches,
        medications: chainMatches.map(m => m.medication),
        severity: pattern.risk_level,
        pillReduction: pattern.pill_reduction,
        resolution: pattern.resolution
      });
    }
  }
  
  // Sort by severity
  const severityOrder = { 'critical': 0, 'high': 1, 'moderate': 2, 'low': 3 };
  detectedCascades.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  return detectedCascades;
};

/**
 * Get detailed cascade analysis with flow diagram data
 */
export const analyzeCascade = (cascade, patient) => {
  const { pattern, matches } = cascade;
  
  const nodes = matches.map((match, index) => ({
    id: `node-${index}`,
    medication: match.medication,
    drugClass: match.step.drug_class,
    causes: match.step.causes,
    causesSymptom: match.step.causes_symptom,
    treats: match.step.treats,
    treatsSymptom: match.step.treats_symptom,
    isStarter: index === 0,
    isTerminal: index === matches.length - 1
  }));
  
  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      from: nodes[i].id,
      to: nodes[i + 1].id,
      label: nodes[i].causes,
      type: 'causes'
    });
    
    edges.push({
      from: nodes[i + 1].id,
      to: nodes[i].id,
      label: 'treats',
      type: 'treats'
    });
  }
  
  // Check if patient has the symptoms mentioned in cascade
  const relevantSymptoms = patient.symptoms.filter(symptom => {
    return nodes.some(node => 
      node.causesSymptom && 
      symptom.symptom.toLowerCase().includes(node.causesSymptom.toLowerCase())
    );
  });
  
  return {
    cascadeName: pattern.name,
    description: pattern.description,
    nodes,
    edges,
    relevantSymptoms,
    pillReduction: pattern.pill_reduction,
    resolution: pattern.resolution,
    riskLevel: pattern.risk_level,
    savingsPotential: pattern.savings_potential
  };
};

/**
 * Suggest resolution actions for a cascade
 */
export const getCascadeResolutionOptions = (cascade) => {
  const { medications } = cascade;
  
  const options = [];
  
  // First medication resolution (often the root cause)
  if (medications.length > 0) {
    const starterMed = medications[0];
    
    switch (starterMed.drug) {
      case 'amlodipine':
        options.push({
          action: 'switch',
          target: starterMed.drug,
          to: 'losartan',
          reason: 'Switch CCB to ARB to eliminate ankle swelling',
          impact: 'May eliminate need for furosemide and potassium supplement'
        });
        break;
      case 'atorvastatin':
        options.push({
          action: 'adjust',
          target: starterMed.drug,
          to: 'lower dose or switch to rosuvastatin',
          reason: 'Reduce muscle pain that requires NSAID treatment',
          impact: 'May allow discontinuation of ibuprofen and omeprazole'
        });
        break;
      case 'lisinopril':
        options.push({
          action: 'switch',
          target: starterMed.drug,
          to: 'losartan',
          reason: 'Switch ACE inhibitor to ARB to eliminate dry cough',
          impact: 'Discontinue cough suppressant'
        });
        break;
      case 'sertraline':
        options.push({
          action: 'adjust',
          target: starterMed.drug,
          to: 'morning dosing or mirtazapine',
          reason: 'Address insomnia without sleep aid',
          impact: 'Discontinue sleep medication'
        });
        break;
      case 'ibuprofen':
        options.push({
          action: 'discontinue',
          target: starterMed.drug,
          to: 'acetaminophen or topical NSAID',
          reason: 'Eliminate NSAID-induced hypertension/GI upset',
          impact: 'May allow simplification of antihypertensive regimen'
        });
        break;
      case 'donepezil':
        options.push({
          action: 'reassess',
          target: starterMed.drug,
          to: 'evaluate benefit vs burden',
          reason: 'Anticholinergic opposes cognitive benefits',
          impact: 'Complex pharmacological decision required'
        });
        break;
      default:
        options.push({
          action: 'review',
          target: starterMed.drug,
          to: 'alternative therapy',
          reason: 'Starting medication may be causing cascade',
          impact: 'Review necessity and alternatives'
        });
    }
  }
  
  // Discontinue downstream medications
  if (medications.length > 2) {
    const downstreamMeds = medications.slice(1);
    options.push({
      action: 'taper',
      target: downstreamMeds.map(m => m.drug).join(', '),
      reason: 'These treat side effects of the starting medication',
      impact: `Potential to discontinue ${downstreamMeds.length} medications`
    });
  }
  
  return options;
};

export default {
  detectCascades,
  analyzeCascade,
  getCascadeResolutionOptions
};
