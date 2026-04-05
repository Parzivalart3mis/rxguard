/**
 * Renal dosing checker — server-side version.
 *
 * Identical logic to src/services/renalDosingChecker.js but
 * renalDosingRulesData is injected as a parameter.
 */

export const checkRenalDosing = (patient, renalDosingRulesData) => {
  const allMeds = [...patient.continuingMeds, ...patient.newMeds];
  const alerts = [];

  for (const med of allMeds) {
    const rules = renalDosingRulesData[med.drug];
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
          type: 'renal_dosing',
        });
        break; // only most severe triggered rule per drug
      }
    }
  }

  const severityOrder = { major: 0, moderate: 1, minor: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  return alerts;
};

export const formatRenalAlert = (alert) => {
  const { drug, dose, frequency, currentEGFR, action, message, severity } = alert;

  const kidneyStage = getKidneyFunctionStage(currentEGFR);

  return {
    severity,
    drug: `${drug} ${dose || ''} ${frequency || ''}`.trim(),
    egfr: `eGFR: ${currentEGFR} mL/min (Stage ${kidneyStage.stage} - ${kidneyStage.label})`,
    action,
    message,
    requiresAction: severity === 'major',
  };
};

export const getKidneyFunctionStage = (egfr) => {
  if (egfr >= 90) return { stage: 1,   label: 'Normal',                             color: 'green' };
  if (egfr >= 60) return { stage: 2,   label: 'Mildly decreased',                   color: 'yellow' };
  if (egfr >= 45) return { stage: '3a', label: 'Mildly to moderately decreased',    color: 'orange' };
  if (egfr >= 30) return { stage: '3b', label: 'Moderately to severely decreased',  color: 'orange' };
  if (egfr >= 15) return { stage: 4,   label: 'Severely decreased',                 color: 'red' };
  return               { stage: 5,   label: 'Kidney failure',                       color: 'red' };
};

export const checkAKIRisk = (patient) => {
  const allMeds = [...patient.continuingMeds, ...patient.newMeds];
  const riskFactors = [];

  const hasACEI     = allMeds.some((m) => m.drug === 'lisinopril');
  const hasDiuretic = allMeds.some((m) => m.drug === 'furosemide');
  const hasNSAID    = allMeds.some((m) => m.drug === 'ibuprofen');

  if (hasACEI && hasDiuretic && hasNSAID) {
    riskFactors.push({
      type: 'triple_whammy',
      severity: 'major',
      title: 'Triple Whammy Combination',
      description: 'ACE inhibitor + Diuretic + NSAID significantly increases AKI risk',
      medications: ['lisinopril', 'furosemide', 'ibuprofen'],
      action: 'Avoid NSAID or monitor kidney function closely',
    });
  }

  const hasMetformin = allMeds.some((m) => m.drug === 'metformin');
  if (hasMetformin && patient.labs.egfr < 30) {
    riskFactors.push({
      type: 'metformin_lactic_acidosis',
      severity: 'major',
      title: 'Metformin Contraindication',
      description: `Metformin contraindicated at eGFR ${patient.labs.egfr}. Risk of lactic acidosis.`,
      medications: ['metformin'],
      action: 'Discontinue metformin immediately',
    });
  }

  return riskFactors;
};
