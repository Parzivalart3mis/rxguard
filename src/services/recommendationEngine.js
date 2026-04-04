// Recommendation engine for antibiotic selection

import { antibiogram, antibioticMetadata } from '../data/antibiogram.js';
import guidelines from '../data/guidelines.js';
import { determineCondition } from './scoringEngine.js';

export const checkAllergies = (antibiotic, allergies) => {
  const metadata = antibioticMetadata[antibiotic];
  if (!metadata) return { safe: true, warnings: [] };

  const warnings = [];
  
  for (const allergy of allergies) {
    const allergySubstance = allergy.substance.toLowerCase();
    
    // Check direct match
    if (allergySubstance === antibiotic.toLowerCase() ||
        allergySubstance === metadata.name.toLowerCase()) {
      warnings.push(`Patient has documented allergy to ${allergy.substance}`);
      continue;
    }

    // Check cross-reactivity
    for (const crossReact of metadata.crossReactivity) {
      if (allergySubstance.includes(crossReact.toLowerCase())) {
        warnings.push(`Potential cross-reactivity: Patient allergic to ${allergy.substance} (${crossReact} class)`);
      }
    }
  }

  return {
    safe: warnings.length === 0,
    warnings,
    critical: warnings.some(w => w.includes("allergy"))
  };
};

export const checkRecentAntibiotic = (antibiotic, pastAntibiotics) => {
  if (!pastAntibiotics || pastAntibiotics.length === 0) {
    return { concern: false, message: null };
  }

  // Check for same antibiotic or class in last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  for (const past of pastAntibiotics) {
    const pastDate = new Date(past.date);
    if (pastDate >= ninetyDaysAgo) {
      const daysAgo = Math.floor((new Date() - pastDate) / (1000 * 60 * 60 * 24));
      
      // Same antibiotic
      if (past.name.toLowerCase().includes(antibiotic.toLowerCase()) ||
          antibiotic.toLowerCase().includes(past.name.toLowerCase())) {
        return {
          concern: true,
          message: `Patient received ${past.name} ${daysAgo} days ago. Consider alternative to reduce resistance risk.`,
          daysSince: daysAgo,
          sameClass: false
        };
      }

      // Same class check
      const currentMeta = antibioticMetadata[antibiotic];
      if (currentMeta && currentMeta.crossReactivity) {
        for (const pastMed of pastAntibiotics) {
          const pastMeta = antibioticMetadata[Object.keys(antibioticMetadata).find(
            k => pastMed.name.toLowerCase().includes(k.toLowerCase())
          )];
          if (pastMeta && pastMeta.crossReactivity.some(c => 
            currentMeta.crossReactivity.includes(c))) {
            return {
              concern: true,
              message: `Patient received ${pastMed.name} from same antibiotic class ${daysAgo} days ago.`,
              daysSince: daysAgo,
              sameClass: true
            };
          }
        }
      }
    }
  }

  return { concern: false, message: null };
};

export const getResistanceData = (antibiotic, pathogens) => {
  const results = [];
  
  for (const pathogen of pathogens) {
    const pathogenData = antibiogram.data.find(p => 
      p.pathogen.toLowerCase().includes(pathogen.toLowerCase()) ||
      pathogen.toLowerCase().includes(p.pathogen.toLowerCase().split(' ')[0])
    );

    if (pathogenData && pathogenData.antibiotics[antibiotic]) {
      const data = pathogenData.antibiotics[antibiotic];
      results.push({
        pathogen: pathogenData.pathogen,
        susceptibility: data.susceptibility,
        resistance: data.resistance,
        trend: data.trend
      });
    }
  }

  // Return the highest resistance concern
  if (results.length === 0) return null;
  
  const worst = results.reduce((max, curr) => curr.resistance > max.resistance ? curr : max);
  return worst;
};

export const rankAlternatives = (condition, patient, excludeAntibiotic = null) => {
  const guideline = guidelines.conditions[condition];
  if (!guideline) return [];

  const candidates = [...guideline.firstLine, ...guideline.alternatives];
  const ranked = [];

  for (const antibiotic of candidates) {
    if (excludeAntibiotic && antibiotic === excludeAntibiotic) continue;
    if (!antibioticMetadata[antibiotic]) continue;

    const metadata = antibioticMetadata[antibiotic];
    
    // Check allergies
    const allergyCheck = checkAllergies(antibiotic, patient.allergies || []);
    if (!allergyCheck.safe && allergyCheck.critical) continue;

    // Check recent use
    const recentCheck = checkRecentAntibiotic(antibiotic, patient.pastAntibiotics || []);
    
    // Get resistance data
    const resistanceData = getResistanceData(antibiotic, guideline.typicalPathogens);
    
    // Calculate score (lower is better)
    let score = metadata.spectrumRank * 10; // Prefer narrow spectrum
    if (allergyCheck.warnings.length > 0) score += 50;
    if (recentCheck.concern) score += 30;
    if (resistanceData) score += resistanceData.resistance * 0.5;
    
    // Bonus for first-line therapy (prefer guidelines over pure resistance data)
    if (guideline.firstLine.includes(antibiotic)) score -= 15;
    
    // Penalty for alternatives that are not first-line
    if (!guideline.firstLine.includes(antibiotic) && guideline.alternatives.includes(antibiotic)) score += 5;

    ranked.push({
      antibiotic,
      name: metadata.name,
      dose: metadata.typicalDose,
      spectrum: metadata.spectrum,
      spectrumRank: metadata.spectrumRank,
      allergyWarnings: allergyCheck.warnings,
      recentUseWarning: recentCheck.message,
      resistanceData,
      score,
      isFirstLine: guideline.firstLine.includes(antibiotic)
    });
  }

  // Sort by score (ascending)
  return ranked.sort((a, b) => a.score - b.score);
};

export const getRecommendation = (patient, selectedAntibiotic = null) => {
  const condition = determineCondition(patient);
  if (!condition) {
    return {
      error: "Unable to determine condition for recommendation",
      recommendation: null,
      alternatives: []
    };
  }

  const guideline = guidelines.conditions[condition];
  if (!guideline) {
    return {
      error: "No guidelines available for this condition",
      recommendation: null,
      alternatives: []
    };
  }

  // Get all ranked alternatives (excluding selected so they appear as alternatives below)
  const alternatives = rankAlternatives(condition, patient, selectedAntibiotic);

  // If selected antibiotic is first-line, re-insert it at the top as the recommendation
  const selectedIsFirstLine = selectedAntibiotic && guideline.firstLine.includes(selectedAntibiotic);

  if (selectedIsFirstLine && selectedAntibiotic && antibioticMetadata[selectedAntibiotic]) {
    const selectedMeta = antibioticMetadata[selectedAntibiotic];
    const allergyCheck = checkAllergies(selectedAntibiotic, patient.allergies || []);
    const recentCheck = checkRecentAntibiotic(selectedAntibiotic, patient.pastAntibiotics || []);
    const resistanceData = getResistanceData(selectedAntibiotic, guideline.typicalPathogens);
    alternatives.unshift({
      antibiotic: selectedAntibiotic,
      name: selectedMeta.name,
      dose: selectedMeta.typicalDose,
      spectrum: selectedMeta.spectrum,
      spectrumRank: selectedMeta.spectrumRank,
      allergyWarnings: allergyCheck.warnings,
      recentUseWarning: recentCheck.message,
      resistanceData,
      isFirstLine: true,
      score: 0
    });
  }
  
  if (alternatives.length === 0) {
    return {
      condition,
      conditionName: guideline.name,
      recommendation: null,
      message: "No suitable antibiotics found (check allergies or guidelines)",
      alternatives: [],
      selectedAntibiotic: selectedAntibiotic ? {
        antibiotic: selectedAntibiotic,
        name: antibioticMetadata[selectedAntibiotic]?.name || selectedAntibiotic,
        ...getAntibioticAssessment(selectedAntibiotic, patient, guideline)
      } : null
    };
  }

  const topChoice = alternatives[0];

  return {
    condition,
    conditionName: guideline.name,
    typicalPathogens: guideline.typicalPathogens,
    duration: guideline.duration,
    notes: guideline.notes,
    recommendation: {
      antibiotic: topChoice.antibiotic,
      name: topChoice.name,
      dose: topChoice.dose,
      spectrum: topChoice.spectrum,
      resistanceData: topChoice.resistanceData,
      rationale: generateRationale(topChoice, guideline, patient)
    },
    alternatives: alternatives.slice(1, 4), // Next 3 alternatives
    selectedAntibiotic: selectedAntibiotic ? {
      antibiotic: selectedAntibiotic,
      name: antibioticMetadata[selectedAntibiotic]?.name || selectedAntibiotic,
      ...getAntibioticAssessment(selectedAntibiotic, patient, guideline)
    } : null
  };
};

const getAntibioticAssessment = (antibiotic, patient, guideline) => {
  const metadata = antibioticMetadata[antibiotic];
  if (!metadata) return { error: "Unknown antibiotic" };

  const allergyCheck = checkAllergies(antibiotic, patient.allergies || []);
  const recentCheck = checkRecentAntibiotic(antibiotic, patient.pastAntibiotics || []);
  const resistanceData = getResistanceData(antibiotic, guideline.typicalPathogens);
  const isFirstLine = guideline.firstLine.includes(antibiotic);
  const isAlternative = guideline.alternatives.includes(antibiotic);

  return {
    dose: metadata.typicalDose,
    spectrum: metadata.spectrum,
    isRecommended: isFirstLine,
    isAcceptable: isFirstLine || isAlternative,
    allergyWarnings: allergyCheck.warnings,
    recentUseWarning: recentCheck.message,
    resistanceData,
    concerns: [
      ...(allergyCheck.warnings || []),
      ...(recentCheck.message ? [recentCheck.message] : []),
      ...(resistanceData && resistanceData.resistance > 20 ? 
        [`High local resistance: ${resistanceData.resistance}%`] : []),
      ...(!isFirstLine && !isAlternative ? ["Not typically indicated for this condition"] : [])
    ].filter(Boolean)
  };
};

const generateRationale = (choice, guideline, patient) => {
  const parts = [];
  
  parts.push(`${choice.name} is ${choice.isFirstLine ? 'first-line' : 'an alternative'} therapy for ${guideline.name}.`);
  
  if (choice.spectrum === 'narrow') {
    parts.push('It provides narrow-spectrum coverage targeted to typical pathogens.');
  }
  
  if (choice.resistanceData) {
    if (choice.resistanceData.resistance < 10) {
      parts.push(`Local ${choice.resistanceData.pathogen} susceptibility is excellent (${choice.resistanceData.susceptibility}%).`);
    } else if (choice.resistanceData.resistance > 20) {
      parts.push(`Note: Local ${choice.resistanceData.pathogen} resistance is ${choice.resistanceData.resistance}%.`);
    }
  }
  
  if (patient.allergies && patient.allergies.length > 0) {
    parts.push('Selected antibiotic avoids documented allergies.');
  }
  
  if (choice.recentUseWarning) {
    parts.push('Patient had recent antibiotic exposure; this option minimizes resistance risk.');
  }
  
  return parts.join(' ');
};

export const getResistanceTrend = (antibiotic, pathogen) => {
  const key = `${antibiotic}_${pathogen.toLowerCase().replace(/[^a-z]/g, '')}`;
  return antibiogram.historicalResistance[key] || null;
};

export const getSpectrumPosition = (antibiotic) => {
  const metadata = antibioticMetadata[antibiotic];
  if (!metadata) return { category: 'unknown', rank: 99 };
  
  const spectrumCats = guidelines.spectrumCategories;
  for (const [cat, data] of Object.entries(spectrumCats)) {
    if (data.antibiotics.includes(antibiotic)) {
      return { 
        category: cat, 
        rank: metadata.spectrumRank,
        label: data.description 
      };
    }
  }
  
  return { category: metadata.spectrum, rank: metadata.spectrumRank };
};

export default {
  getRecommendation,
  checkAllergies,
  checkRecentAntibiotic,
  getResistanceData,
  rankAlternatives,
  getResistanceTrend,
  getSpectrumPosition
};
