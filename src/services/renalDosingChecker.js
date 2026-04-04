// Renal Dosing Checker
// Checks medication doses against kidney function

import { renalDosingRules } from '../data/renalDosingRules.js';

/**
 * Check all medications for renal dosing concerns
 */
export const checkRenalDosing = (patient) => {
  const allMeds = [...patient.continuingMeds, ...patient.newMeds];
  const alerts = [];
  
  for (const med of allMeds) {
    const rules = renalDosingRules[med.drug];
    if (!rules) continue;
    
    for (const requirement of rules.requirements) {
      if (patient.labs.egfr < requirement.egfr_threshold) {
        alerts.push({
          drug: med.drug,
          drugClass: rules.class,
          dose: med.dose,
          frequency: med.frequency,
          currentEGFR: patient.labs.egfr,
          threshold: requirement.egfr_threshold,
          action: requirement.action,
          message: requirement.message,
          severity: requirement.severity,
          reason: med.reason,
          type: 'renal_dosing'
        });
        break; // Only report the most severe threshold met
      }
    }
  }
  
  // Sort by severity
  const severityOrder = { 'major': 0, 'moderate': 1, 'minor': 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  return alerts;
};

/**
 * Check a specific medication for renal dosing
 */
export const checkSingleDrugRenalDosing = (drug, egfr) => {
  const rules = renalDosingRules[drug];
  if (!rules) return null;
  
  for (const requirement of rules.requirements) {
    if (egfr < requirement.egfr_threshold) {
      return {
        drug,
        drugClass: rules.class,
        currentEGFR: egfr,
        threshold: requirement.egfr_threshold,
        action: requirement.action,
        message: requirement.message,
        severity: requirement.severity
      };
    }
  }
  
  return null;
};

/**
 * Get all renal-impaired patients' medications that need attention
 */
export const getRenalRiskMedications = (patient) => {
  if (patient.labs.egfr >= 60) {
    return []; // Normal kidney function
  }
  
  const allMeds = [...patient.continuingMeds, ...patient.newMeds];
  const riskMeds = [];
  
  for (const med of allMeds) {
    const renalConcern = checkSingleDrugRenalDosing(med.drug, patient.labs.egfr);
    if (renalConcern) {
      riskMeds.push({
        medication: med,
        concern: renalConcern
      });
    }
  }
  
  return riskMeds;
};

/**
 * Calculate kidney function stage
 */
export const getKidneyFunctionStage = (egfr) => {
  if (egfr >= 90) return { stage: 1, label: 'Normal', color: 'green' };
  if (egfr >= 60) return { stage: 2, label: 'Mildly decreased', color: 'yellow' };
  if (egfr >= 45) return { stage: '3a', label: 'Mildly to moderately decreased', color: 'orange' };
  if (egfr >= 30) return { stage: '3b', label: 'Moderately to severely decreased', color: 'orange' };
  if (egfr >= 15) return { stage: 4, label: 'Severely decreased', color: 'red' };
  return { stage: 5, label: 'Kidney failure', color: 'red' };
};

/**
 * Format renal alert for display
 */
export const formatRenalAlert = (alert) => {
  const { drug, dose, frequency, currentEGFR, action, message, severity } = alert;
  
  let emoji = '🟡';
  if (severity === 'major') emoji = '🔴';
  if (severity === 'minor') emoji = '🟢';
  
  const kidneyStage = getKidneyFunctionStage(currentEGFR);
  
  return {
    emoji,
    severity,
    title: `${emoji} RENAL DOSING ${severity.toUpperCase()}`,
    drug: `${drug} ${dose} ${frequency}`,
    egfr: `eGFR: ${currentEGFR} mL/min (Stage ${kidneyStage.stage} - ${kidneyStage.label})`,
    action,
    message,
    requiresAction: severity === 'major'
  };
};

/**
 * Get recommended dose adjustment for a drug
 */
export const getDoseAdjustment = (drug, egfr) => {
  const rules = renalDosingRules[drug];
  if (!rules) return null;
  
  for (const requirement of rules.requirements) {
    if (egfr < requirement.egfr_threshold) {
      return {
        originalDose: 'current dose',
        adjustment: requirement.action,
        reason: `eGFR ${egfr} below threshold ${requirement.egfr_threshold}`,
        message: requirement.message
      };
    }
  }
  
  return null;
};

/**
 * Check if patient is at risk for AKI (acute kidney injury)
 * from medication combinations
 */
export const checkAKIRisk = (patient) => {
  const allMeds = [...patient.continuingMeds, ...patient.newMeds];
  const riskFactors = [];
  
  // Triple Whammy: ACEI/ARB + Diuretic + NSAID
  const hasACEI = allMeds.some(m => m.drug === 'lisinopril');
  const hasDiuretic = allMeds.some(m => m.drug === 'furosemide');
  const hasNSAID = allMeds.some(m => m.drug === 'ibuprofen');
  
  if (hasACEI && hasDiuretic && hasNSAID) {
    riskFactors.push({
      type: 'triple_whammy',
      severity: 'major',
      title: 'Triple Whammy Combination',
      description: 'ACE inhibitor + Diuretic + NSAID significantly increases AKI risk',
      medications: ['lisinopril', 'furosemide', 'ibuprofen'],
      action: 'Avoid NSAID or monitor kidney function closely'
    });
  }
  
  // Metformin in impaired kidney function
  const hasMetformin = allMeds.some(m => m.drug === 'metformin');
  if (hasMetformin && patient.labs.egfr < 30) {
    riskFactors.push({
      type: 'metformin_lactic_acidosis',
      severity: 'major',
      title: 'Metformin Contraindication',
      description: `Metformin contraindicated at eGFR ${patient.labs.egfr}. Risk of lactic acidosis.`,
      medications: ['metformin'],
      action: 'Discontinue metformin immediately'
    });
  }
  
  // Contrast + Metformin
  // (Would need additional data about recent contrast exposure)
  
  return riskFactors;
};

export default {
  checkRenalDosing,
  checkSingleDrugRenalDosing,
  getRenalRiskMedications,
  getKidneyFunctionStage,
  formatRenalAlert,
  getDoseAdjustment,
  checkAKIRisk
};
