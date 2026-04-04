// Safety Engine Orchestrator
// Runs all safety checks and consolidates alerts

import { detectADEs } from './adeDetectionEngine.js';
import { detectCascades, analyzeCascade } from './cascadeDetector.js';
import { checkAllInteractions, checkClassInteractions } from './interactionChecker.js';
import { checkRenalDosing, checkAKIRisk, formatRenalAlert } from './renalDosingChecker.js';

/**
 * Run all safety checks and return consolidated alerts
 */
export const runSafetyChecks = (patient) => {
  const alerts = {
    critical: [],
    major: [],
    moderate: [],
    minor: [],
    informational: []
  };
  
  // 1. ADE Detection
  const adeAlerts = detectADEs(patient);
  for (const ade of adeAlerts) {
    const alert = {
      type: 'ade',
      severity: ade.severity,
      title: `ADE Alert: ${ade.symptom.symptom}`,
      description: `${ade.topMatch.sideEffect.description} likely from ${ade.topMatch.drug}`,
      details: ade,
      action: 'Review medication necessity'
    };
    
    addToSeverityBucket(alerts, alert);
  }
  
  // 2. Prescribing Cascade Detection
  const cascades = detectCascades(patient);
  for (const cascade of cascades) {
    const analysis = analyzeCascade(cascade, patient);
    const alert = {
      type: 'cascade',
      severity: cascade.severity,
      title: `Prescribing Cascade: ${cascade.pattern.name}`,
      description: cascade.pattern.description,
      details: analysis,
      medications: cascade.medications,
      pillReduction: cascade.pillReduction,
      action: cascade.pattern.resolution,
      savings: `Potential reduction: ${cascade.pillReduction}`
    };
    
    addToSeverityBucket(alerts, alert);
  }
  
  // 3. Drug-Drug Interactions
  const interactions = checkAllInteractions(patient);
  for (const interaction of interactions) {
    const isNew = interaction.hasNewDrug;
    const severity = interaction.severity === 'major' ? 'critical' : 
                     interaction.severity === 'moderate' && isNew ? 'major' : 
                     interaction.severity;
    
    const alert = {
      type: 'interaction',
      severity,
      title: `Drug Interaction: ${interaction.drug1.drug} + ${interaction.drug2.drug}`,
      description: interaction.effect,
      details: interaction,
      action: interaction.action,
      isNewDrugInvolved: isNew
    };
    
    addToSeverityBucket(alerts, alert);
  }
  
  // 4. Class-based Interactions
  const classAlerts = checkClassInteractions(patient);
  for (const alert of classAlerts) {
    addToSeverityBucket(alerts, {
      type: 'class_interaction',
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      action: alert.action,
      medications: alert.medications
    });
  }
  
  // 5. Renal Dosing Checks
  const renalAlerts = checkRenalDosing(patient);
  for (const renal of renalAlerts) {
    const formatted = formatRenalAlert(renal);
    const alert = {
      type: 'renal',
      severity: renal.severity,
      title: `Renal Dosing: ${renal.drug}`,
      description: formatted.message,
      details: renal,
      action: formatted.action,
      egfr: renal.currentEGFR
    };
    
    addToSeverityBucket(alerts, alert);
  }
  
  // 6. AKI Risk Assessment
  const akiRisks = checkAKIRisk(patient);
  for (const risk of akiRisks) {
    addToSeverityBucket(alerts, {
      type: 'aki_risk',
      severity: risk.severity,
      title: risk.title,
      description: risk.description,
      action: risk.action,
      medications: risk.medications
    });
  }
  
  // Calculate statistics
  const stats = {
    total: adeAlerts.length + cascades.length + interactions.length + 
           classAlerts.length + renalAlerts.length + akiRisks.length,
    critical: alerts.critical.length,
    major: alerts.major.length,
    moderate: alerts.moderate.length,
    minor: alerts.minor.length,
    resolved: 0,
    pending: 0
  };
  
  return {
    alerts,
    stats,
    allAlerts: [
      ...alerts.critical,
      ...alerts.major,
      ...alerts.moderate,
      ...alerts.minor,
      ...alerts.informational
    ],
    requiresAction: alerts.critical.length > 0 || alerts.major.length > 0
  };
};

/**
 * Add alert to appropriate severity bucket
 */
const addToSeverityBucket = (alerts, alert) => {
  switch (alert.severity) {
    case 'critical':
      alerts.critical.push(alert);
      break;
    case 'major':
      alerts.major.push(alert);
      break;
    case 'moderate':
      alerts.moderate.push(alert);
      break;
    case 'minor':
      alerts.minor.push(alert);
      break;
    default:
      alerts.informational.push(alert);
  }
};

/**
 * Get medication status summary
 */
export const getMedicationStatus = (patient) => {
  const status = {
    continuing: {
      total: patient.continuingMeds.length,
      flagged: 0
    },
    new: {
      total: patient.newMeds.length,
      flagged: 0
    },
    stopped: {
      total: patient.stoppedMeds.length
    }
  };
  
  // Run safety check to see which meds are flagged
  const safetyResult = runSafetyChecks(patient);
  
  // Check each med for alerts
  for (const med of patient.continuingMeds) {
    const hasAlert = safetyResult.allAlerts.some(alert => {
      if (alert.medications) {
        return alert.medications.some(m => m.drug === med.drug);
      }
      if (alert.details && alert.details.topMatch) {
        return alert.details.topMatch.drug === med.drug;
      }
      if (alert.details && alert.details.drug) {
        return alert.details.drug === med.drug;
      }
      return false;
    });
    
    if (hasAlert) status.continuing.flagged++;
  }
  
  for (const med of patient.newMeds) {
    const hasAlert = safetyResult.allAlerts.some(alert => {
      if (alert.medications) {
        return alert.medications.some(m => m.drug === med.drug);
      }
      if (alert.details && alert.details.newDrug) {
        return alert.details.newDrug.drug === med.drug;
      }
      return false;
    });
    
    if (hasAlert) status.new.flagged++;
  }
  
  return status;
};

/**
 * Check if discharge can proceed
 */
export const canDischargeProceed = (safetyResult, resolvedAlertIds = []) => {
  // Must resolve all critical alerts
  const unresolvedCritical = safetyResult.alerts.critical.filter(
    alert => !resolvedAlertIds.includes(alert.title)
  );
  
  if (unresolvedCritical.length > 0) {
    return {
      canProceed: false,
      reason: `${unresolvedCritical.length} critical alert(s) must be resolved`,
      blockingAlerts: unresolvedCritical
    };
  }
  
  // Recommend resolving major alerts
  const unresolvedMajor = safetyResult.alerts.major.filter(
    alert => !resolvedAlertIds.includes(alert.title)
  );
  
  if (unresolvedMajor.length > 0) {
    return {
      canProceed: true,
      warning: `${unresolvedMajor.length} major alert(s) should be reviewed`,
      pendingAlerts: unresolvedMajor
    };
  }
  
  return {
    canProceed: true,
    warning: null
  };
};

/**
 * Get resolution options for an alert
 */
export const getAlertResolutionOptions = (alert) => {
  const options = [];
  
  switch (alert.type) {
    case 'ade':
      options.push(
        { action: 'switch', label: 'Switch Medication', icon: 'swap' },
        { action: 'adjust', label: 'Adjust Dose', icon: 'slider' },
        { action: 'stop', label: 'Stop Medication', icon: 'x' },
        { action: 'acknowledge', label: 'Acknowledge & Monitor', icon: 'check' }
      );
      break;
      
    case 'cascade':
      options.push(
        { action: 'resolve', label: 'Resolve Cascade', icon: 'link-break' },
        { action: 'acknowledge', label: 'Acknowledge', icon: 'check' }
      );
      break;
      
    case 'interaction':
      options.push(
        { action: 'switch', label: 'Switch Drug', icon: 'swap' },
        { action: 'monitor', label: 'Add Monitoring', icon: 'eye' },
        { action: 'acknowledge', label: 'Acknowledge', icon: 'check' }
      );
      break;
      
    case 'renal':
      options.push(
        { action: 'adjust', label: 'Adjust Dose', icon: 'slider' },
        { action: 'stop', label: 'Hold Medication', icon: 'pause' },
        { action: 'monitor', label: 'Monitor Closely', icon: 'eye' }
      );
      break;
      
    default:
      options.push(
        { action: 'acknowledge', label: 'Acknowledge', icon: 'check' },
        { action: 'review', label: 'Review', icon: 'eye' }
      );
  }
  
  return options;
};

export default {
  runSafetyChecks,
  getMedicationStatus,
  canDischargeProceed,
  getAlertResolutionOptions
};
