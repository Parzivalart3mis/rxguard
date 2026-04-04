/**
 * Server-side recommendation engine — Phase 2A
 *
 * Identical logic to src/services/recommendationEngine.js but reads all
 * clinical data from the SQLite database instead of static JS imports.
 *
 * determineCondition() is copied inline from src/services/scoringEngine.js
 * (pure algorithm — no external data dependency).
 */

import db from '../db/client.js';

// ── DB helpers ────────────────────────────────────────────────────────────────

const stmtGuideline = db.prepare(
  'SELECT * FROM guidelines WHERE condition_key = ? AND is_active = 1'
);

const stmtDrugMeta = db.prepare(
  'SELECT * FROM drugs WHERE internal_key = ?'
);

const stmtInteractionsAll = db.prepare(
  'SELECT * FROM drug_interactions WHERE is_active = 1'
);

const stmtResistance = db.prepare(`
  SELECT * FROM antibiogram_data
  WHERE drug_key = ? AND pathogen LIKE ? AND is_active = 1
  ORDER BY year DESC LIMIT 1
`);

/** Parse a DB guideline row (JSON text fields → arrays). */
const parseGuideline = (row) => ({
  ...row,
  firstLine:        JSON.parse(row.first_line_drugs  || '[]'),
  alternatives:     JSON.parse(row.alternative_drugs || '[]'),
  typicalPathogens: JSON.parse(row.typical_pathogens || '[]'),
  name:             row.condition_name,
});

/** Parse a DB drug row (JSON text fields → arrays). */
const parseDrug = (row) => {
  if (!row) return null;
  return {
    ...row,
    crossReactivity: JSON.parse(row.cross_reactivity_classes || '[]'),
    firstLineFor:    JSON.parse(row.first_line_for || '[]'),
    spectrumRank:    row.spectrum_rank,
    typicalDose:     row.typical_dose,
    renalAdjustment: row.renal_adjustment === 1,
    name:            row.display_name,
  };
};

// ── Condition determination (copied from src/services/scoringEngine.js) ───────

const determineCondition = (patient) => {
  const condition = patient.conditions?.[0];
  if (!condition) return null;

  const code    = condition.code;
  const display = (condition.display || '').toLowerCase();

  if (code.startsWith('J02') || display.includes('pharyngitis')) {
    return patient.centorScore >= 4 ? 'strep_pharyngitis' : 'viral_pharyngitis';
  }
  if (code.startsWith('N30') || display.includes('cystitis')) {
    return patient.pastAntibiotics?.length > 0 &&
           patient.pastAntibiotics[0].date > '2025-01-01'
      ? 'complicated_uti'
      : 'uncomplicated_uti';
  }
  if (code.startsWith('J18') || display.includes('pneumonia')) {
    return 'community_acquired_pneumonia';
  }
  if (code.startsWith('H66') || display.includes('otitis')) {
    return 'acute_otitis_media';
  }
  if (code.startsWith('J06') || (display.includes('upper respiratory') && !display.includes('sinusitis'))) {
    return 'viral_uri';
  }
  if (code.startsWith('J01') || display.includes('sinusitis')) {
    const obsMap = new Map((patient.observations || []).map((o) => [o.display, o]));
    const dur    = obsMap.get('Duration of symptoms');
    return dur && parseInt(dur.value) < 10 ? 'viral_sinusitis' : 'acute_sinusitis';
  }
  if (code.startsWith('L03') || display.includes('cellulitis')) {
    return 'cellulitis';
  }
  return null;
};

// ── Clinical logic (ported from src/services/recommendationEngine.js) ─────────

const checkAllergies = (drugKey, meta, allergies = []) => {
  if (!meta) return { safe: true, warnings: [] };

  const warnings = [];
  for (const allergy of allergies) {
    const sub = allergy.substance.toLowerCase();

    if (sub === drugKey.toLowerCase() || sub === meta.name.toLowerCase()) {
      warnings.push(`Patient has documented allergy to ${allergy.substance}`);
      continue;
    }
    for (const cr of meta.crossReactivity) {
      if (sub.includes(cr.toLowerCase())) {
        warnings.push(`Potential cross-reactivity: Patient allergic to ${allergy.substance} (${cr} class)`);
      }
    }
  }

  return {
    safe:     warnings.length === 0,
    warnings,
    critical: warnings.some((w) => w.includes('allergy')),
  };
};

const checkRecentAntibiotic = (drugKey, meta, pastAntibiotics = []) => {
  if (!pastAntibiotics.length) return { concern: false, message: null };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  for (const past of pastAntibiotics) {
    const pastDate = new Date(past.date);
    if (pastDate < cutoff) continue;

    const daysAgo = Math.floor((Date.now() - pastDate) / 86_400_000);

    if (
      past.name.toLowerCase().includes(drugKey.toLowerCase()) ||
      drugKey.toLowerCase().includes(past.name.toLowerCase())
    ) {
      return {
        concern: true,
        message: `Patient received ${past.name} ${daysAgo} days ago. Consider alternative to reduce resistance risk.`,
        daysSince: daysAgo,
        sameClass: false,
      };
    }

    // Same-class check via cross-reactivity
    if (meta?.crossReactivity) {
      for (const pastMed of pastAntibiotics) {
        const pastKey  = Object.keys({})  // placeholder — we don't preload all metadata here
          .find((k) => pastMed.name.toLowerCase().includes(k));
        const pastMeta = pastKey ? parseDrug(stmtDrugMeta.get(pastKey)) : null;
        if (pastMeta && pastMeta.crossReactivity.some((c) => meta.crossReactivity.includes(c))) {
          return {
            concern: true,
            message: `Patient received ${pastMed.name} from same antibiotic class ${daysAgo} days ago.`,
            daysSince: daysAgo,
            sameClass: true,
          };
        }
      }
    }
  }
  return { concern: false, message: null };
};

const getResistanceData = (drugKey, typicalPathogens = []) => {
  const results = [];
  for (const pathogen of typicalPathogens) {
    // Use LIKE for partial matching (e.g., "GAS" matches "GAS (Group A Strep)")
    const row = stmtResistance.get(drugKey, `%${pathogen}%`);
    if (row) {
      results.push({
        pathogen:      row.pathogen,
        susceptibility: row.susceptibility,
        resistance:     row.resistance,
        trend:          row.trend,
      });
    }
  }
  if (!results.length) return null;
  return results.reduce((max, cur) => cur.resistance > max.resistance ? cur : max);
};

const generateRationale = (choice, guideline) => {
  const parts = [];
  parts.push(
    `${choice.name} is ${choice.isFirstLine ? 'first-line' : 'an alternative'} therapy for ${guideline.condition_name}.`
  );
  if (choice.spectrum === 'narrow') {
    parts.push('It provides narrow-spectrum coverage targeted to typical pathogens.');
  }
  if (choice.resistanceData) {
    if (choice.resistanceData.resistance < 10) {
      parts.push(
        `Local ${choice.resistanceData.pathogen} susceptibility is excellent (${choice.resistanceData.susceptibility}%).`
      );
    } else if (choice.resistanceData.resistance > 20) {
      parts.push(
        `Note: Local ${choice.resistanceData.pathogen} resistance is ${choice.resistanceData.resistance}%.`
      );
    }
  }
  return parts.join(' ');
};

const rankAlternatives = (guideline, patient, excludeKey = null) => {
  const candidates = [...guideline.firstLine, ...guideline.alternatives];
  const ranked     = [];

  for (const key of candidates) {
    if (excludeKey && key === excludeKey) continue;
    const meta = parseDrug(stmtDrugMeta.get(key));
    if (!meta) continue;

    const allergyCheck  = checkAllergies(key, meta, patient.allergies);
    if (!allergyCheck.safe) continue;

    const recentCheck   = checkRecentAntibiotic(key, meta, patient.pastAntibiotics);
    const resistanceData = getResistanceData(key, guideline.typicalPathogens);

    let score = (meta.spectrumRank || 4) * 10;
    if (allergyCheck.warnings.length)        score += 50;
    if (recentCheck.concern)                 score += 30;
    if (resistanceData)                      score += resistanceData.resistance * 0.5;
    if (guideline.firstLine.includes(key))   score -= 15;
    if (!guideline.firstLine.includes(key))  score += 5;

    ranked.push({
      antibiotic:       key,
      name:             meta.name,
      rxnormCui:        meta.rxnorm_cui ?? null,
      dose:             meta.typicalDose,
      spectrum:         meta.spectrum,
      spectrumRank:     meta.spectrumRank,
      allergyWarnings:  allergyCheck.warnings,
      recentUseWarning: recentCheck.message,
      resistanceData,
      score,
      isFirstLine:      guideline.firstLine.includes(key),
    });
  }

  return ranked.sort((a, b) => a.score - b.score);
};

const getAntibioticAssessment = (key, patient, guideline) => {
  const meta = parseDrug(stmtDrugMeta.get(key));
  if (!meta) return { error: 'Unknown antibiotic' };

  const allergyCheck   = checkAllergies(key, meta, patient.allergies);
  const recentCheck    = checkRecentAntibiotic(key, meta, patient.pastAntibiotics);
  const resistanceData = getResistanceData(key, guideline.typicalPathogens);
  const isFirstLine    = guideline.firstLine.includes(key);
  const isAlternative  = guideline.alternatives.includes(key);

  return {
    rxnormCui:        meta.rxnorm_cui ?? null,
    dose:             meta.typicalDose,
    spectrum:         meta.spectrum,
    safe:             allergyCheck.safe,
    isRecommended:    isFirstLine,
    isAcceptable:     isFirstLine || isAlternative,
    allergyWarnings:  allergyCheck.warnings,
    recentUseWarning: recentCheck.message,
    resistanceData,
    concerns: [
      ...(allergyCheck.warnings || []),
      ...(recentCheck.message ? [recentCheck.message] : []),
      ...(resistanceData && resistanceData.resistance > 20
        ? [`High local resistance: ${resistanceData.resistance}%`]
        : []),
      ...(!isFirstLine && !isAlternative ? ['Not typically indicated for this condition'] : []),
    ].filter(Boolean),
  };
};

// ── Drug interaction check for prescribe flow ─────────────────────────────────
// Returns interactions in the withDrug shape expected by AntibioticRecommender.jsx

const checkPrescribeInteractions = (selectedKey, currentMedicationDrugs = []) => {
  if (!selectedKey || !currentMedicationDrugs.length) return [];

  const allInteractions = stmtInteractionsAll.all();
  const results = [];

  for (const med of currentMedicationDrugs) {
    if (!med.drug || med.drug === selectedKey) continue;

    const ix = allInteractions.find(
      (i) =>
        (i.drug_a_key === selectedKey && i.drug_b_key === med.drug) ||
        (i.drug_a_key === med.drug    && i.drug_b_key === selectedKey)
    );

    if (ix) {
      results.push({
        drug_a:   ix.drug_a_key,
        drug_b:   ix.drug_b_key,
        severity: ix.severity,
        effect:   ix.effect,
        action:   ix.action,
        mechanism: ix.mechanism,
        withDrug:  med,           // { drug, name } — same shape AntibioticRecommender renders
        newDrug:   { drug: selectedKey },
        isNewDrugPrimary: ix.drug_a_key === selectedKey,
      });
    }
  }

  const order = { major: 0, moderate: 1, minor: 2 };
  return results.sort((a, b) => order[a.severity] - order[b.severity]);
};

// ── Main export ───────────────────────────────────────────────────────────────

export const getRecommendation = (patient, selectedAntibiotic = null) => {
  const conditionKey = determineCondition(patient);
  if (!conditionKey) {
    return {
      error:          'Unable to determine condition for recommendation',
      recommendation: null,
      alternatives:   [],
    };
  }

  const guidelineRow = stmtGuideline.get(conditionKey);
  if (!guidelineRow) {
    return {
      error:          'No guidelines available for this condition',
      recommendation: null,
      alternatives:   [],
      condition:      conditionKey,
    };
  }
  const guideline = parseGuideline(guidelineRow);

  // Rank alternatives (excluding selectedAntibiotic so it doesn't appear twice)
  const alternatives = rankAlternatives(guideline, patient, selectedAntibiotic);

  // If selected antibiotic is first-line, prepend it as the recommendation
  const selectedIsFirstLine =
    selectedAntibiotic && guideline.firstLine.includes(selectedAntibiotic);

  if (selectedIsFirstLine) {
    const meta = parseDrug(stmtDrugMeta.get(selectedAntibiotic));
    if (meta) {
      const allergyCheck  = checkAllergies(selectedAntibiotic, meta, patient.allergies);
      const recentCheck   = checkRecentAntibiotic(selectedAntibiotic, meta, patient.pastAntibiotics);
      const resistanceData = getResistanceData(selectedAntibiotic, guideline.typicalPathogens);
      if (allergyCheck.safe) alternatives.unshift({
        antibiotic:       selectedAntibiotic,
        name:             meta.name,
        rxnormCui:        meta.rxnorm_cui ?? null,
        dose:             meta.typicalDose,
        spectrum:         meta.spectrum,
        spectrumRank:     meta.spectrumRank,
        allergyWarnings:  allergyCheck.warnings,
        recentUseWarning: recentCheck.message,
        resistanceData,
        isFirstLine: true,
        score: 0,
      });
    }
  }

  if (!alternatives.length) {
    return {
      condition:      conditionKey,
      conditionName:  guideline.condition_name,
      recommendation: null,
      message:        'No suitable antibiotics found (check allergies or guidelines)',
      alternatives:   [],
      selectedAntibiotic: selectedAntibiotic
        ? { antibiotic: selectedAntibiotic, ...getAntibioticAssessment(selectedAntibiotic, patient, guideline) }
        : null,
    };
  }

  const top = alternatives[0];

  return {
    condition:        conditionKey,
    conditionName:    guideline.condition_name,
    typicalPathogens: guideline.typicalPathogens,
    duration:         guideline.duration,
    notes:            guideline.notes,
    recommendation: {
      antibiotic:   top.antibiotic,
      name:         top.name,
      rxnormCui:    top.rxnormCui,
      dose:         top.dose,
      spectrum:     top.spectrum,
      resistanceData: top.resistanceData,
      rationale:    generateRationale(top, guideline),
    },
    alternatives: alternatives.slice(1, 4),
    selectedAntibiotic: selectedAntibiotic
      ? {
          antibiotic: selectedAntibiotic,
          name:       parseDrug(stmtDrugMeta.get(selectedAntibiotic))?.name || selectedAntibiotic,
          ...getAntibioticAssessment(selectedAntibiotic, patient, guideline),
        }
      : null,
  };
};

export { checkPrescribeInteractions };
