/**
 * ADE Detection Engine — server-side version.
 *
 * Identical logic to src/services/adeDetectionEngine.js but
 * drugSideEffectsData is injected as a parameter.
 */

const FREQUENCY_SCORES = {
  very_common: 80,
  common:      60,
  uncommon:    30,
  rare:        10,
  unknown:     0,
};

const ONSET_WINDOWS = {
  hours:  { min: 0,   max: 24   },
  days:   { min: 1,   max: 7    },
  weeks:  { min: 7,   max: 42   },
  months: { min: 30,  max: 180  },
  years:  { min: 365, max: 3650 },
};

const getDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end   = new Date(endDate);
  return Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
};

const checkOnsetWindow = (symptomOnset, drugStartDate, onsetWindow) => {
  if (!symptomOnset || !drugStartDate || !onsetWindow) return 0;

  const daysAfterDrug = getDaysBetween(drugStartDate, symptomOnset);
  const windowParts   = onsetWindow.split(/[-\s]+/);
  let windowType      = windowParts[0];
  let multiplier      = 1;

  if (windowParts.includes('weeks') || windowParts[1] === 'weeks') {
    multiplier = 7; windowType = 'weeks';
  } else if (windowParts.includes('months')) {
    multiplier = 30; windowType = 'months';
  }

  const window = ONSET_WINDOWS[windowType];
  if (!window) return 0;

  const minDays = window.min * multiplier;
  const maxDays = window.max * multiplier;

  if (daysAfterDrug >= minDays && daysAfterDrug <= maxDays)             return 10;
  if (daysAfterDrug >= minDays * 0.5 && daysAfterDrug <= maxDays * 1.5) return 5;
  return 0;
};

const generateExplanation = (sideEffect, modifiers) => {
  const parts = [];
  parts.push(`${sideEffect.frequency.replace('_', ' ')} side effect (${sideEffect.pct}% of patients)`);
  if (modifiers.afterDrugStarted > 0)   parts.push('symptom started after medication');
  if (modifiers.withinOnsetWindow > 0)  parts.push(`typical onset: ${sideEffect.onset}`);
  if (modifiers.elderly > 0)            parts.push('increased risk with age >65');
  if (modifiers.kidneyImpairment > 0)   parts.push('reduced drug clearance with kidney impairment');
  return parts.join('. ');
};

export const calculateADEScore = (symptom, drug, patient, drugSideEffectsData) => {
  const drugData = drugSideEffectsData[drug.drug];
  if (!drugData) return null;

  const sideEffect = drugData.side_effects.find(
    (se) =>
      se.symptom.toLowerCase().includes(symptom.symptom.toLowerCase()) ||
      symptom.symptom.toLowerCase().includes(se.symptom.toLowerCase()) ||
      (se.description && se.description.toLowerCase().includes(symptom.symptom.toLowerCase()))
  );
  if (!sideEffect) return null;

  let score = FREQUENCY_SCORES[sideEffect.frequency] || 0;
  const modifiers = {
    afterDrugStarted:  0,
    withinOnsetWindow: 0,
    elderly:           0,
    kidneyImpairment:  0,
    longTermUse:       0,
  };

  if (symptom.onset && drug.startDate) {
    if (getDaysBetween(drug.startDate, symptom.onset) > 0) {
      modifiers.afterDrugStarted = 15;
      score += 15;
    }
  }

  const onsetScore = checkOnsetWindow(symptom.onset, drug.startDate, sideEffect.onset);
  if (onsetScore > 0) {
    modifiers.withinOnsetWindow = onsetScore;
    score += onsetScore;
  }

  if (patient.age > 65) {
    modifiers.elderly = 10;
    score += 10;
  }

  if (patient.labs.egfr < 30) {
    modifiers.kidneyImpairment = 10;
    score += 10;
  }

  if (drug.startDate) {
    const daysOnDrug = getDaysBetween(drug.startDate, new Date().toISOString());
    if (daysOnDrug > 365) {
      modifiers.longTermUse = -20; score -= 20;
    } else if (daysOnDrug > 180) {
      modifiers.longTermUse = -10; score -= 10;
    }
  }

  score = Math.min(100, Math.max(0, score));

  return {
    score,
    drug:       drug.drug,
    drugName:   drugData.class,
    symptom:    symptom.symptom,
    sideEffect,
    modifiers,
    explanation: generateExplanation(sideEffect, modifiers),
  };
};

export const detectADEs = (patient, drugSideEffectsData) => {
  const allMeds = [...patient.continuingMeds, ...patient.newMeds];
  const alerts  = [];

  for (const symptom of patient.symptoms) {
    const drugMatches = [];

    for (const drug of allMeds) {
      const result = calculateADEScore(symptom, drug, patient, drugSideEffectsData);
      if (result && result.score >= 25) drugMatches.push(result);
    }

    drugMatches.sort((a, b) => b.score - a.score);

    if (drugMatches.length > 0) {
      alerts.push({
        symptom,
        topMatch: drugMatches[0],
        allMatches: drugMatches,
        type: 'ade',
        severity:
          drugMatches[0].score >= 70 ? 'high' :
          drugMatches[0].score >= 50 ? 'moderate' : 'low',
      });
    }
  }

  alerts.sort((a, b) => b.topMatch.score - a.topMatch.score);
  return alerts;
};
