// ADE (Adverse Drug Event) Detection Engine
// Scores symptom-drug associations based on probability

import { drugSideEffects } from '../data/drugSideEffects.js';

// Frequency to base score mapping
const FREQUENCY_SCORES = {
  'very_common': 80,  // ≥10%
  'common': 60,       // 1-10%
  'uncommon': 30,    // 0.1-1%
  'rare': 10,        // <0.1%
  'unknown': 0
};

// Onset window scoring (typical timeframes for side effects)
const ONSET_WINDOWS = {
  'hours': { min: 0, max: 24 },
  'days': { min: 1, max: 7 },
  'weeks': { min: 7, max: 42 },
  'months': { min: 30, max: 180 },
  'years': { min: 365, max: 3650 }
};

/**
 * Calculate days between two dates
 */
const getDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Check if symptom onset falls within typical window for side effect
 */
const checkOnsetWindow = (symptomOnset, drugStartDate, onsetWindow) => {
  if (!symptomOnset || !drugStartDate || !onsetWindow) return 0;
  
  const daysAfterDrug = getDaysBetween(drugStartDate, symptomOnset);
  
  // Parse onset window (e.g., "days", "weeks", "1-6 weeks")
  const windowParts = onsetWindow.split(/[-\s]+/);
  let windowType = windowParts[0];
  let multiplier = 1;
  
  if (windowParts.includes('weeks') || windowParts[1] === 'weeks') {
    multiplier = 7;
    windowType = 'weeks';
  } else if (windowParts.includes('months')) {
    multiplier = 30;
    windowType = 'months';
  }
  
  const window = ONSET_WINDOWS[windowType];
  if (!window) return 0;
  
  const minDays = window.min * multiplier;
  const maxDays = window.max * multiplier;
  
  // If within window, score bonus
  if (daysAfterDrug >= minDays && daysAfterDrug <= maxDays) {
    return 10;
  }
  
  // Partial credit if close
  if (daysAfterDrug >= minDays * 0.5 && daysAfterDrug <= maxDays * 1.5) {
    return 5;
  }
  
  return 0;
};

/**
 * Calculate ADE probability score for a symptom-drug pair
 */
export const calculateADEScore = (symptom, drug, patient) => {
  const drugData = drugSideEffects[drug.drug];
  if (!drugData) return null;
  
  // Find matching side effect
  const sideEffect = drugData.side_effects.find(se => 
    se.symptom.toLowerCase().includes(symptom.symptom.toLowerCase()) ||
    symptom.symptom.toLowerCase().includes(se.symptom.toLowerCase()) ||
    se.description.toLowerCase().includes(symptom.symptom.toLowerCase())
  );
  
  if (!sideEffect) return null;
  
  // Base score from frequency
  let score = FREQUENCY_SCORES[sideEffect.frequency] || 0;
  
  // Modifiers
  let modifiers = {
    afterDrugStarted: 0,
    withinOnsetWindow: 0,
    elderly: 0,
    kidneyImpairment: 0,
    longTermUse: 0
  };
  
  // Symptom started after drug?
  if (symptom.onset && drug.startDate) {
    const daysAfterDrug = getDaysBetween(drug.startDate, symptom.onset);
    if (daysAfterDrug > 0) {
      modifiers.afterDrugStarted = 15;
      score += 15;
    }
  }
  
  // Within typical onset window?
  const onsetScore = checkOnsetWindow(symptom.onset, drug.startDate, sideEffect.onset);
  if (onsetScore > 0) {
    modifiers.withinOnsetWindow = onsetScore;
    score += onsetScore;
  }
  
  // Elderly modifier (>65)
  if (patient.age > 65) {
    modifiers.elderly = 10;
    score += 10;
  }
  
  // Kidney impairment modifier
  if (patient.labs.egfr < 30) {
    modifiers.kidneyImpairment = 10;
    score += 10;
  }
  
  // Long-term use reduces likelihood (drug tolerance develops)
  if (drug.startDate) {
    const daysOnDrug = getDaysBetween(drug.startDate, new Date().toISOString());
    if (daysOnDrug > 365) {
      modifiers.longTermUse = -20;
      score -= 20;
    } else if (daysOnDrug > 180) {
      modifiers.longTermUse = -10;
      score -= 10;
    }
  }
  
  // Cap at 100
  score = Math.min(100, Math.max(0, score));
  
  return {
    score,
    drug: drug.drug,
    drugName: drugData.class,
    symptom: symptom.symptom,
    sideEffect: sideEffect,
    modifiers,
    explanation: generateExplanation(sideEffect, modifiers, score)
  };
};

/**
 * Generate human-readable explanation
 */
const generateExplanation = (sideEffect, modifiers) => {
  const parts = [];
  
  parts.push(`${sideEffect.frequency.replace('_', ' ')} side effect (${sideEffect.pct}% of patients)`);
  
  if (modifiers.afterDrugStarted > 0) {
    parts.push('symptom started after medication');
  }
  
  if (modifiers.withinOnsetWindow > 0) {
    parts.push(`typical onset: ${sideEffect.onset}`);
  }
  
  if (modifiers.elderly > 0) {
    parts.push('increased risk with age >65');
  }
  
  if (modifiers.kidneyImpairment > 0) {
    parts.push('reduced drug clearance with kidney impairment');
  }
  
  return parts.join('. ');
};

/**
 * Check all medications against all symptoms
 */
export const detectADEs = (patient) => {
  const allMeds = [...patient.continuingMeds, ...patient.newMeds];
  const alerts = [];
  
  for (const symptom of patient.symptoms) {
    const drugMatches = [];
    
    for (const drug of allMeds) {
      const result = calculateADEScore(symptom, drug, patient);
      if (result && result.score >= 25) {
        drugMatches.push(result);
      }
    }
    
    // Sort by score descending
    drugMatches.sort((a, b) => b.score - a.score);
    
    if (drugMatches.length > 0) {
      alerts.push({
        symptom: symptom,
        topMatch: drugMatches[0],
        allMatches: drugMatches,
        type: 'ade',
        severity: drugMatches[0].score >= 70 ? 'high' : drugMatches[0].score >= 50 ? 'moderate' : 'low'
      });
    }
  }
  
  // Sort alerts by top match score
  alerts.sort((a, b) => b.topMatch.score - a.topMatch.score);
  
  return alerts;
};

/**
 * Get ADE summary for a specific medication
 */
export const getADEsForMedication = (drugName, patient) => {
  const matchingSymptoms = [];
  
  const allMeds = [...patient.continuingMeds, ...patient.newMeds];
  const drug = allMeds.find(m => m.drug === drugName);
  
  if (!drug) return [];
  
  for (const symptom of patient.symptoms) {
    const result = calculateADEScore(symptom, drug, patient);
    if (result && result.score >= 25) {
      matchingSymptoms.push(result);
    }
  }
  
  return matchingSymptoms.sort((a, b) => b.score - a.score);
};

export default {
  detectADEs,
  calculateADEScore,
  getADEsForMedication
};
