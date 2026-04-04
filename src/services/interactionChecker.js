// Drug-Drug Interaction Checker

import { drugInteractions } from '../data/drugInteractions.js';

/**
 * Find all interactions between a drug and a medication list
 */
export const checkDrugInteractions = (drug, medications) => {
  const interactions = [];
  
  for (const med of medications) {
    // Skip checking against itself
    if (med.drug === drug.drug) continue;
    
    // Check for interaction in both directions
    const interaction = drugInteractions.find(i => 
      (i.drug_a === drug.drug && i.drug_b === med.drug) ||
      (i.drug_a === med.drug && i.drug_b === drug.drug)
    );
    
    if (interaction) {
      interactions.push({
        ...interaction,
        withDrug: med,
        newDrug: drug,
        isNewDrugPrimary: interaction.drug_a === drug.drug
      });
    }
  }
  
  // Sort by severity
  const severityOrder = { 'major': 0, 'moderate': 1, 'minor': 2 };
  interactions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  return interactions;
};

/**
 * Check all interactions in patient's medication list
 */
export const checkAllInteractions = (patient) => {
  const allMeds = [...patient.continuingMeds, ...patient.newMeds];
  const interactions = [];
  const checkedPairs = new Set();
  
  for (let i = 0; i < allMeds.length; i++) {
    for (let j = i + 1; j < allMeds.length; j++) {
      const med1 = allMeds[i];
      const med2 = allMeds[j];
      
      // Create unique pair identifier
      const pairId = [med1.drug, med2.drug].sort().join('-');
      if (checkedPairs.has(pairId)) continue;
      checkedPairs.add(pairId);
      
      const interaction = drugInteractions.find(i => 
        (i.drug_a === med1.drug && i.drug_b === med2.drug) ||
        (i.drug_a === med2.drug && i.drug_b === med1.drug)
      );
      
      if (interaction) {
        // Determine if one of the drugs is new
        const isMed1New = patient.newMeds.some(m => m.drug === med1.drug);
        const isMed2New = patient.newMeds.some(m => m.drug === med2.drug);
        
        interactions.push({
          ...interaction,
          drug1: med1,
          drug2: med2,
          drug1IsNew: isMed1New,
          drug2IsNew: isMed2New,
          bothContinuing: !isMed1New && !isMed2New,
          hasNewDrug: isMed1New || isMed2New
        });
      }
    }
  }
  
  // Sort: new drug interactions first, then by severity
  const severityOrder = { 'major': 0, 'moderate': 1, 'minor': 2 };
  interactions.sort((a, b) => {
    if (a.hasNewDrug && !b.hasNewDrug) return -1;
    if (!a.hasNewDrug && b.hasNewDrug) return 1;
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
  
  return interactions;
};

/**
 * Get high-risk interactions that need immediate attention
 */
export const getCriticalInteractions = (patient) => {
  const allInteractions = checkAllInteractions(patient);
  return allInteractions.filter(i => 
    i.severity === 'major' || 
    (i.severity === 'moderate' && i.hasNewDrug)
  );
};

/**
 * Format interaction for display
 */
export const formatInteractionAlert = (interaction) => {
  const { drug1, drug2, severity, effect, action, mechanism } = interaction;
  
  let emoji = '🟡';
  if (severity === 'major') emoji = '🔴';
  if (severity === 'minor') emoji = '🟢';
  
  const newDrugLabel = interaction.hasNewDrug ? 
    (interaction.drug1IsNew ? `(NEW: ${drug1.drug})` : `(NEW: ${drug2.drug})`) : 
    '(both continuing)';
  
  return {
    emoji,
    severity,
    title: `${emoji} ${severity.toUpperCase()} INTERACTION`,
    drugs: `${drug1.drug} + ${drug2.drug}`,
    newDrugLabel,
    effect,
    action,
    mechanism,
    requiresAction: severity === 'major' || (severity === 'moderate' && interaction.hasNewDrug)
  };
};

/**
 * Check for specific drug class interactions
 */
export const checkClassInteractions = (patient) => {
  const allMeds = [...patient.continuingMeds, ...patient.newMeds];
  const classAlerts = [];
  
  // Check anticoagulant + antibiotic combinations
  const hasAnticoagulant = allMeds.some(m => m.drug === 'warfarin');
  const hasAntibiotic = allMeds.some(m => 
    ['amoxicillin', 'azithromycin', 'tmp_smx', 'ciprofloxacin'].includes(m.drug)
  );
  
  if (hasAnticoagulant && hasAntibiotic) {
    const antibiotic = allMeds.find(m => 
      ['amoxicillin', 'azithromycin', 'tmp_smx', 'ciprofloxacin'].includes(m.drug)
    );
    
    classAlerts.push({
      type: 'anticoagulant_antibiotic',
      severity: 'major',
      title: 'Anticoagulant + Antibiotic Interaction',
      description: `Warfarin + ${antibiotic.drug} increases bleeding risk`,
      action: 'Check INR 3-5 days after starting antibiotic. Consider antibiotic alternative.',
      medications: ['warfarin', antibiotic.drug]
    });
  }
  
  // Check NSAID + antihypertensive combinations
  const hasNSAID = allMeds.some(m => m.drug === 'ibuprofen');
  const hasACEI = allMeds.some(m => m.drug === 'lisinopril');
  const hasDiuretic = allMeds.some(m => m.drug === 'furosemide');
  
  if (hasNSAID && (hasACEI || hasDiuretic)) {
    classAlerts.push({
      type: 'nsaid_renal',
      severity: 'major',
      title: 'NSAID + ACEI/Diuretic Triple Whammy',
      description: 'NSAID + ACE inhibitor + Diuretic increases acute kidney injury risk',
      action: 'Avoid this combination if possible. Monitor kidney function closely.',
      medications: ['ibuprofen', 'lisinopril', 'furosemide'].filter(d => 
        allMeds.some(m => m.drug === d)
      )
    });
  }
  
  // Check SSRI + NSAID GI bleeding risk
  const hasSSRI = allMeds.some(m => m.drug === 'sertraline');
  if (hasSSRI && hasNSAID) {
    classAlerts.push({
      type: 'ssri_nsaid_bleeding',
      severity: 'moderate',
      title: 'SSRI + NSAID GI Bleeding Risk',
      description: 'Combining SSRI and NSAID increases risk of gastrointestinal bleeding',
      action: 'Consider adding PPI protection or switching pain medication.',
      medications: ['sertraline', 'ibuprofen']
    });
  }
  
  return classAlerts;
};

export default {
  checkDrugInteractions,
  checkAllInteractions,
  getCriticalInteractions,
  formatInteractionAlert,
  checkClassInteractions
};
