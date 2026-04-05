/**
 * Safety Engine Orchestrator — server-side version.
 *
 * Runs all safety checks against database-loaded data.
 * Returns the same shape as the client-side runSafetyChecks().
 */

import db from '../db/client.js';
import { checkAllInteractions, checkClassInteractions } from './interactionChecker.js';
import { checkRenalDosing, checkAKIRisk, formatRenalAlert } from './renalDosingChecker.js';
import { detectADEs } from './adeDetectionEngine.js';
import { detectCascades, analyzeCascade } from './cascadeDetector.js';

// ── DB data loaders ───────────────────────────────────────────────────────────

function loadDrugInteractions() {
  return db
    .prepare('SELECT * FROM drug_interactions WHERE is_active = 1')
    .all()
    .map((r) => ({
      drug_a:    r.drug_a_key,
      drug_b:    r.drug_b_key,
      severity:  r.severity,
      effect:    r.effect,
      mechanism: r.mechanism,
      action:    r.action,
    }));
}

function loadRenalDosingRules() {
  const rows = db
    .prepare(`
      SELECT rdr.*, d.drug_class as class_name
      FROM renal_dosing_rules rdr
      LEFT JOIN drugs d ON d.internal_key = rdr.drug_key
      WHERE rdr.is_active = 1
      ORDER BY rdr.drug_key, rdr.egfr_threshold DESC
    `)
    .all();

  const rules = {};
  for (const row of rows) {
    if (!rules[row.drug_key]) {
      rules[row.drug_key] = {
        drug:         row.drug_key,
        class:        row.class_name || row.drug_key,
        requirements: [],
      };
    }
    rules[row.drug_key].requirements.push({
      egfr_threshold: row.egfr_threshold,
      action:         row.action,
      message:        row.message,
      severity:       row.severity,
    });
  }
  return rules;
}

function loadDrugSideEffects() {
  const rows = db
    .prepare(`
      SELECT dse.*, d.drug_class as class_name
      FROM drug_side_effects dse
      LEFT JOIN drugs d ON d.internal_key = dse.drug_key
      WHERE dse.is_active = 1
    `)
    .all();

  const sideEffects = {};
  for (const row of rows) {
    if (!sideEffects[row.drug_key]) {
      sideEffects[row.drug_key] = {
        class:        row.class_name || row.drug_key,
        side_effects: [],
      };
    }
    sideEffects[row.drug_key].side_effects.push({
      symptom:     row.symptom,
      frequency:   row.frequency,
      pct:         row.frequency_pct,
      onset:       row.onset,
      description: row.description,
    });
  }
  return sideEffects;
}

function loadCascadePatterns() {
  return db
    .prepare('SELECT * FROM cascade_patterns WHERE is_active = 1')
    .all()
    .map((r) => ({ ...r, chain: JSON.parse(r.chain) }));
}

// ── helpers ───────────────────────────────────────────────────────────────────

const addToSeverityBucket = (alerts, alert) => {
  switch (alert.severity) {
    case 'critical':     alerts.critical.push(alert);     break;
    case 'major':        alerts.major.push(alert);        break;
    case 'moderate':     alerts.moderate.push(alert);     break;
    case 'minor':        alerts.minor.push(alert);        break;
    default:             alerts.informational.push(alert); break;
  }
};

// ── main export ───────────────────────────────────────────────────────────────

export const runSafetyChecks = (patient) => {
  // Load all clinical data from DB (synchronous)
  const drugInteractionsData = loadDrugInteractions();
  const renalDosingRulesData = loadRenalDosingRules();
  const drugSideEffectsData  = loadDrugSideEffects();
  const cascadePatternsData  = loadCascadePatterns();

  const alerts = {
    critical:      [],
    major:         [],
    moderate:      [],
    minor:         [],
    informational: [],
  };

  // 1. ADE Detection
  const adeAlerts = detectADEs(patient, drugSideEffectsData);
  for (const ade of adeAlerts) {
    addToSeverityBucket(alerts, {
      type:        'ade',
      severity:    ade.severity,
      title:       `ADE Alert: ${ade.symptom.symptom}`,
      description: `${ade.topMatch.sideEffect.description} likely from ${ade.topMatch.drug}`,
      details:     ade,
      action:      'Review medication necessity',
    });
  }

  // 2. Prescribing Cascade Detection
  const cascades = detectCascades(patient, cascadePatternsData);
  for (const cascade of cascades) {
    const analysis = analyzeCascade(cascade, patient);
    addToSeverityBucket(alerts, {
      type:         'cascade',
      severity:     cascade.severity,
      title:        `Prescribing Cascade: ${cascade.pattern.name}`,
      description:  cascade.pattern.description,
      details:      analysis,
      medications:  cascade.medications,
      pillReduction: cascade.pillReduction,
      action:       cascade.pattern.resolution,
      savings:      `Potential reduction: ${cascade.pillReduction}`,
    });
  }

  // 3. Drug-Drug Interactions
  const interactions = checkAllInteractions(patient, drugInteractionsData);
  for (const interaction of interactions) {
    const isNew     = interaction.hasNewDrug;
    const severity  =
      interaction.severity === 'major' ? 'critical' :
      interaction.severity === 'moderate' && isNew ? 'major' :
      interaction.severity;

    addToSeverityBucket(alerts, {
      type:              'interaction',
      severity,
      title:             `Drug Interaction: ${interaction.drug1.drug} + ${interaction.drug2.drug}`,
      description:       interaction.effect,
      details:           interaction,
      action:            interaction.action,
      isNewDrugInvolved: isNew,
    });
  }

  // 4. Class-based Interactions
  const classAlerts = checkClassInteractions(patient);
  for (const alert of classAlerts) {
    addToSeverityBucket(alerts, {
      type:        'class_interaction',
      severity:    alert.severity,
      title:       alert.title,
      description: alert.description,
      action:      alert.action,
      medications: alert.medications,
    });
  }

  // 5. Renal Dosing Checks
  const renalAlerts = checkRenalDosing(patient, renalDosingRulesData);
  for (const renal of renalAlerts) {
    const formatted = formatRenalAlert(renal);
    addToSeverityBucket(alerts, {
      type:        'renal',
      severity:    renal.severity,
      title:       `Renal Dosing: ${renal.drug}`,
      description: formatted.message,
      details:     renal,
      action:      formatted.action,
      egfr:        renal.currentEGFR,
    });
  }

  // 6. AKI Risk Assessment
  const akiRisks = checkAKIRisk(patient);
  for (const risk of akiRisks) {
    addToSeverityBucket(alerts, {
      type:        'aki_risk',
      severity:    risk.severity,
      title:       risk.title,
      description: risk.description,
      action:      risk.action,
      medications: risk.medications,
    });
  }

  const stats = {
    total:    adeAlerts.length + cascades.length + interactions.length +
              classAlerts.length + renalAlerts.length + akiRisks.length,
    critical: alerts.critical.length,
    major:    alerts.major.length,
    moderate: alerts.moderate.length,
    minor:    alerts.minor.length,
    resolved: 0,
    pending:  0,
  };

  return {
    alerts,
    stats,
    allAlerts: [
      ...alerts.critical,
      ...alerts.major,
      ...alerts.moderate,
      ...alerts.minor,
      ...alerts.informational,
    ],
    requiresAction: alerts.critical.length > 0 || alerts.major.length > 0,
  };
};
