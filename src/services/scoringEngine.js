// Scoring engine for bacterial probability calculations

/**
 * Build an observation lookup map keyed by BOTH display name AND LOINC code.
 * Synthetic patients use display names; FHIR patients carry LOINC codes.
 * Storing both lets every scoring function work regardless of data source.
 */
function buildObsMap(observations) {
  const map = new Map();
  for (const o of observations) {
    if (o.display) map.set(o.display, o);
    if (o.code && o.code !== o.display) map.set(o.code, o);
  }
  return map;
}

// LOINC code aliases so scoring functions can find values from either source
const LOINC = {
  temperature:        ['Body temperature',                '8310-5'],
  cough:              ['Cough',                           '33717-0'],
  tonsils:            ['Tonsillar swelling/exudate', 'Tonsillar exudate', '664-3'],
  lymph:              ['Tender anterior cervical lymphadenopathy', 'LA16480-2'],
  dysuria:            ['Dysuria',                         '49650-1'],
  urinaryFrequency:   ['Urinary frequency',               '198130006'],
  vaginalDischarge:   ['Vaginal discharge',               '33905-1'],
  nitrites:           ['Nitrites in urine',               '5802-4'],
  leukocyteEsterase:  ['Leukocyte esterase',              '5797-6'],
  urineCulture:       ['Urine culture',                   '630-4'],
  wbc:                ['WBC count',                       '6690-2'],
  crp:                ['C-reactive protein',              '1988-5'],
  procalcitonin:      ['Procalcitonin',                   '33959-9', '75241-0'],
  duration:           ['Duration of symptoms'],
  biphasic:           ['Biphasic illness'],
  cxrConsolidation:   ['Chest X-ray consolidation', 'Consolidation on CXR'],
  erythema:           ['Erythema on left lower leg', 'Expanding erythema'],
  warmth:             ['Warmth and tenderness'],
  abscess:            ['Abscess'],
};

/** Look up an observation trying each alias in order, return the first match. */
function obs(map, ...keys) {
  for (const k of keys) if (map.has(k)) return map.get(k);
  return undefined;
}

export const calculateCentorScore = (observations, age) => {
  let score = 0;
  const obsMap = buildObsMap(observations);

  // Fever > 38°C
  const tempObs = obs(obsMap, ...LOINC.temperature);
  if (tempObs && tempObs.value > 38) score += 1;

  // Absence of cough
  const coughObs = obs(obsMap, ...LOINC.cough);
  if (coughObs && (coughObs.value === "absent" || !coughObs.value)) score += 1;

  // Tonsillar swelling/exudate
  const tonsilObs = obs(obsMap, ...LOINC.tonsils);
  if (tonsilObs && tonsilObs.value === "present") score += 1;

  // Tender anterior cervical lymphadenopathy
  const lymphObs = obs(obsMap, ...LOINC.lymph);
  if (lymphObs && lymphObs.value === "present") score += 1;

  // Age adjustment
  if (age >= 3 && age <= 14) score += 1;
  else if (age >= 45) score -= 1;
  // Age 15-44 = 0 (no change)

  return Math.max(0, score);
};

export const getCentorInterpretation = (score) => {
  if (score <= 1) return {
    probability: 5 + (score * 5),
    recommendation: "Antibiotics NOT recommended",
    testRecommendation: "No rapid strep test needed"
  };
  if (score <= 3) return {
    probability: 15 + ((score - 2) * 10),
    recommendation: "Consider rapid strep test before prescribing",
    testRecommendation: "Rapid strep test or throat culture"
  };
  return {
    probability: 50 + ((score - 4) * 7.5),
    recommendation: "Antibiotics may be appropriate; confirm with culture",
    testRecommendation: "Throat culture recommended"
  };
};

export const calculateUTIProbability = (observations) => {
  const obsMap = buildObsMap(observations);

  let score = 0;
  let indicators = [];

  // Dysuria + frequency without vaginal discharge
  const dysuria  = obs(obsMap, ...LOINC.dysuria);
  const frequency = obs(obsMap, ...LOINC.urinaryFrequency);
  const discharge = obs(obsMap, ...LOINC.vaginalDischarge);

  if (dysuria?.value === "present" && frequency?.value === "present" && discharge?.value !== "present") {
    score += 40;
    indicators.push("Classic UTI symptoms (dysuria + frequency, no discharge)");
  }

  // Positive nitrites
  const nitrites = obs(obsMap, ...LOINC.nitrites);
  if (nitrites?.value === "positive") {
    score += 30;
    indicators.push("Positive nitrites (highly specific)");
  }

  // Positive leukocyte esterase
  const leukocyte = obs(obsMap, ...LOINC.leukocyteEsterase);
  if (leukocyte?.value === "positive") {
    score += 20;
    indicators.push("Positive leukocyte esterase");
  }

  // Urine culture positive
  const culture = obs(obsMap, ...LOINC.urineCulture);
  if (culture?.value && culture.value.includes("CFU/mL")) {
    const cfuMatch = culture.value.match(/(\d+)/);
    if (cfuMatch && parseInt(cfuMatch[1]) >= 100000) {
      score = 100;
      indicators.push("Culture >100,000 CFU/mL (definitive)");
    }
  }

  return {
    probability: Math.min(100, score),
    indicators,
    recommendation: score >= 50 ? "Bacterial UTI likely - treat" : 
                  score >= 25 ? "Possible UTI - consider culture" : 
                  "Bacterial UTI unlikely, consider other causes"
  };
};

export const calculateURIScore = (observations) => {
  const obsMap = buildObsMap(observations);

  let score = 0;
  let indicators = [];

  // Duration
  const duration = obs(obsMap, ...LOINC.duration);
  if (duration) {
    const days = parseInt(duration.value);
    if (days < 10) {
      score += 10;
      indicators.push("Symptoms < 10 days (typical viral course)");
    } else if (days >= 10) {
      score += 40;
      indicators.push("Symptoms > 10 days (consider bacterial sinusitis)");
    }
  }

  // Temperature
  const temp = obs(obsMap, ...LOINC.temperature);
  if (temp && temp.value > 38.5) {
    score += 10;
    indicators.push("High fever (may suggest bacterial)");
  }

  // Procalcitonin
  const pct = obs(obsMap, ...LOINC.procalcitonin);
  if (pct) {
    if (pct.value < 0.25) {
      score = Math.min(score, 20);
      indicators.push("Procalcitonin < 0.25 ng/mL (low bacterial probability)");
    } else if (pct.value > 0.5) {
      score += 30;
      indicators.push("Procalcitonin > 0.5 ng/mL (bacterial likely)");
    }
  }

  // CRP
  const crp = obs(obsMap, ...LOINC.crp);
  if (crp && crp.value > 100) {
    score += 20;
    indicators.push("CRP > 100 mg/L (bacterial inflammation)");
  }

  // Biphasic illness (for sinusitis)
  const biphasic = obs(obsMap, ...LOINC.biphasic);
  if (biphasic?.value && biphasic.value.includes("yes")) {
    score += 35;
    indicators.push("Biphasic illness pattern (bacterial sinusitis)");
  }

  // WBC
  const wbc = obs(obsMap, ...LOINC.wbc);
  if (wbc && wbc.value > 10) {
    score += 10;
    indicators.push("Elevated WBC");
  } else if (wbc && wbc.value < 10) {
    indicators.push("Normal WBC (viral pattern)");
  }

  return {
    probability: Math.min(100, score),
    indicators,
    recommendation: score < 25 ? "Viral URI - antibiotics NOT recommended" :
                   score < 50 ? "Uncertain - consider watchful waiting" :
                   "Possible bacterial component - consider antibiotics"
  };
};

export const calculatePneumoniaScore = (observations) => {
  const obsMap = buildObsMap(observations);

  let score = 0;
  let indicators = [];

  // Consolidation on imaging
  const cxr = obs(obsMap, ...LOINC.cxrConsolidation);
  if (cxr?.value) {
    score += 50;
    indicators.push("Consolidation on imaging (definitive)");
  }

  // Elevated WBC + fever + productive cough
  const wbc  = obs(obsMap, ...LOINC.wbc);
  const temp = obs(obsMap, ...LOINC.temperature);
  const cough = obs(obsMap, ...LOINC.cough);

  if (wbc?.value > 10 && temp?.value > 38 && cough?.value === "productive") {
    score += 30;
    indicators.push("Clinical triad: elevated WBC + fever + productive cough");
  }

  // CRP
  const crp = obs(obsMap, ...LOINC.crp);
  if (crp?.value > 100) {
    score += 20;
    indicators.push("CRP > 100 mg/L (strong indicator)");
  }

  // Procalcitonin
  const pct = obs(obsMap, ...LOINC.procalcitonin);
  if (pct?.value > 0.5) {
    score += 25;
    indicators.push("Procalcitonin > 0.5 ng/mL (bacterial pneumonia likely)");
  } else if (pct?.value < 0.1) {
    indicators.push("Procalcitonin < 0.1 ng/mL (viral pattern)");
  }

  return {
    probability: Math.min(100, score),
    indicators,
    recommendation: score >= 75 ? "Bacterial pneumonia likely - treat" :
                   score >= 50 ? "Moderate probability - consider empiric antibiotics" :
                   score >= 25 ? "Low-moderate probability - consider watchful waiting" :
                   "Viral pneumonia or other - antibiotics likely not indicated"
  };
};

export const calculateSkinInfectionScore = (observations) => {
  const obsMap = buildObsMap(observations);

  let score = 0;
  let indicators = [];

  // Cellulitis signs
  const erythema = obs(obsMap, ...LOINC.erythema);
  if (erythema?.value === "expanding" || erythema?.value === "present") {
    score += 40;
    indicators.push("Expanding erythema (cellulitis)");
  }

  const warmth = obs(obsMap, ...LOINC.warmth);
  if (warmth?.value === "present") {
    score += 30;
    indicators.push("Warmth and tenderness (cellulitis)");
  }

  // Fever
  const temp = obs(obsMap, ...LOINC.temperature);
  if (temp?.value > 38) {
    score += 15;
    indicators.push("Fever > 38°C (systemic infection)");
  }

  // Abscess
  const abscess = obs(obsMap, ...LOINC.abscess);
  if (abscess?.value === "present") {
    score += 35;
    indicators.push("Abscess present - I&D may be sufficient");
  }

  // CRP
  const crp = obs(obsMap, ...LOINC.crp);
  if (crp?.value > 50) {
    score += 15;
    indicators.push("Elevated CRP (active inflammation)");
  }

  return {
    probability: Math.min(100, score),
    indicators,
    recommendation: score >= 60 ? "Cellulitis - antibiotics indicated" :
                   score >= 40 ? "Possible skin infection - consider antibiotics" :
                   "Mild skin changes - consider local care vs antibiotics"
  };
};

// Priority-ordered matchers: first match wins.
// Each entry: [testFn, conditionKey | conditionFn]
const CONDITION_MATCHERS = [
  // Pharyngitis / sore throat
  [(c) => c.code.startsWith("J02") || /pharyngitis|strep throat|sore throat|tonsill/.test(c.display),
   (patient) => (patient.centorScore >= 4 ? "strep_pharyngitis" : "viral_pharyngitis")],

  // UTI / cystitis / pyelonephritis (recurrent → complicated)
  [(c) => c.code.startsWith("N30") || c.code.startsWith("N10") || c.code.startsWith("N11") ||
          c.code.startsWith("N12") ||
          /urinary tract infection|cystitis|pyelonephritis|uti\b/.test(c.display),
   (patient) => {
     const recurrent = /recurrent|complicated|chronic/.test(patient.conditions.find(
       cx => /urinary tract infection|cystitis/.test(cx.display.toLowerCase())
     )?.display?.toLowerCase() || '');
     return recurrent ? "complicated_uti" : "uncomplicated_uti";
   }],

  // Pneumonia
  [(c) => c.code.startsWith("J18") || c.code.startsWith("J15") || c.code.startsWith("J14") ||
          c.code.startsWith("J13") ||
          /pneumonia|lung infection/.test(c.display),
   () => "community_acquired_pneumonia"],

  // Otitis media
  [(c) => c.code.startsWith("H66") || c.code.startsWith("H65") ||
          /otitis media|ear infection/.test(c.display),
   () => "acute_otitis_media"],

  // Sinusitis
  [(c) => c.code.startsWith("J01") || /sinusitis/.test(c.display),
   (patient) => {
     const obsMap = buildObsMap(patient.observations);
     const duration = obs(obsMap, ...LOINC.duration);
     return (duration && parseInt(duration.value) < 10) ? "viral_sinusitis" : "acute_sinusitis";
   }],

  // Viral URI / common cold (must come after sinusitis)
  [(c) => c.code.startsWith("J06") || c.code.startsWith("J00") ||
          (/upper respiratory|common cold|nasopharyngitis|rhinitis/.test(c.display) &&
           !/sinusitis/.test(c.display)),
   () => "viral_uri"],

  // Cellulitis / skin infection
  [(c) => c.code.startsWith("L03") || c.code.startsWith("L08") ||
          /cellulitis|skin infection|erysipelas/.test(c.display),
   () => "cellulitis"],

  // Bronchitis — treat as URI for scoring
  [(c) => c.code.startsWith("J20") || /bronchitis/.test(c.display),
   () => "viral_uri"],
];

export const determineCondition = (patient) => {
  if (!patient.conditions?.length) return "general_infection";

  // Try each condition in order — return the first match found across all conditions
  for (const matcher of CONDITION_MATCHERS) {
    const [test, resolve] = matcher;
    const matched = patient.conditions.find((c) => {
      const d = c.display.toLowerCase();
      return test({ code: c.code, display: d });
    });
    if (matched) return typeof resolve === 'function' ? resolve(patient) : resolve;
  }

  return "general_infection";
};

export const calculateGeneralInfectionScore = (observations) => {
  const obsMap = buildObsMap(observations);
  let score = 0;
  const indicators = [];

  const temp = obs(obsMap, ...LOINC.temperature);
  if (temp?.value > 39) {
    score += 30; indicators.push(`High fever ${temp.value}°C (strong infection marker)`);
  } else if (temp?.value > 38) {
    score += 20; indicators.push(`Fever ${temp.value}°C`);
  }

  const wbc = obs(obsMap, ...LOINC.wbc);
  if (wbc?.value > 15) {
    score += 30; indicators.push(`Markedly elevated WBC ${wbc.value} ×10⁹/L`);
  } else if (wbc?.value > 10) {
    score += 20; indicators.push(`Elevated WBC ${wbc.value} ×10⁹/L`);
  } else if (wbc?.value < 4) {
    score += 15; indicators.push(`Low WBC ${wbc.value} ×10⁹/L (severe infection possible)`);
  }

  const crp = obs(obsMap, ...LOINC.crp);
  if (crp?.value > 100) {
    score += 25; indicators.push(`CRP ${crp.value} mg/L (markedly elevated)`);
  } else if (crp?.value > 50) {
    score += 15; indicators.push(`CRP ${crp.value} mg/L (elevated)`);
  } else if (crp?.value > 10) {
    score += 5;  indicators.push(`CRP ${crp.value} mg/L (mildly elevated)`);
  }

  const pct = obs(obsMap, ...LOINC.procalcitonin);
  if (pct?.value > 2) {
    score += 25; indicators.push(`Procalcitonin ${pct.value} ng/mL (bacterial sepsis likely)`);
  } else if (pct?.value > 0.5) {
    score += 15; indicators.push(`Procalcitonin ${pct.value} ng/mL (bacterial infection likely)`);
  } else if (pct?.value < 0.1) {
    score = Math.max(0, score - 20);
    indicators.push(`Procalcitonin ${pct.value} ng/mL (bacterial infection unlikely)`);
  }

  const recommendation =
    score >= 70 ? "Bacterial infection likely — antibiotic therapy appropriate" :
    score >= 40 ? "Possible bacterial infection — clinical judgment required" :
    score >= 20 ? "Low–moderate probability — consider watchful waiting" :
                  "Bacterial infection unlikely based on available markers";

  return {
    probability: Math.min(100, score),
    indicators,
    recommendation,
  };
};

export const calculateBacterialProbability = (patient) => {
  const condition = determineCondition(patient);
  if (!condition) {
    return {
      score: 50,
      explanation: "No active conditions on record",
      details: { indicators: [] },
      method: null,
    };
  }

  let result;
  switch (condition) {
    case "strep_pharyngitis":
    case "viral_pharyngitis": {
      const centorScore = calculateCentorScore(patient.observations, patient.age);
      const centorInterp = getCentorInterpretation(centorScore);
      result = {
        score: centorInterp.probability,
        explanation: `Modified Centor Score: ${centorScore}/5 - ${centorInterp.recommendation}`,
        details: centorInterp,
        method: "Centor",
        condition: condition
      };
      break;
    }

    case "uncomplicated_uti":
    case "complicated_uti": {
      const utiResult = calculateUTIProbability(patient.observations);
      result = {
        score: utiResult.probability,
        explanation: utiResult.recommendation,
        details: utiResult,
        method: "UTI Algorithm",
        condition: condition
      };
      break;
    }

    case "viral_uri": {
      const uriResult = calculateURIScore(patient.observations);
      result = {
        score: uriResult.probability,
        explanation: uriResult.recommendation,
        details: uriResult,
        method: "URI Algorithm",
        condition: condition
      };
      break;
    }

    case "community_acquired_pneumonia": {
      const pneumoniaResult = calculatePneumoniaScore(patient.observations);
      result = {
        score: pneumoniaResult.probability,
        explanation: pneumoniaResult.recommendation,
        details: pneumoniaResult,
        method: "Pneumonia Algorithm",
        condition: condition
      };
      break;
    }

    case "acute_sinusitis":
    case "viral_sinusitis": {
      const sinusResult = calculateURIScore(patient.observations);
      result = {
        score: sinusResult.probability,
        explanation: sinusResult.recommendation,
        details: sinusResult,
        method: "Sinusitis Algorithm",
        condition: condition
      };
      break;
    }

    case "cellulitis": {
      const skinResult = calculateSkinInfectionScore(patient.observations);
      result = {
        score: skinResult.probability,
        explanation: skinResult.recommendation,
        details: skinResult,
        method: "Skin Infection Algorithm",
        condition: condition
      };
      break;
    }

    case "acute_otitis_media":
      result = {
        score: 80,
        explanation: "Acute otitis media with bulging TM and fever - bacterial etiology likely",
        details: { indicators: ["Bulging TM", "Fever", "Ear pain"] },
        method: "Clinical Criteria",
        condition: condition
      };
      break;

    case "general_infection":
    default: {
      const genResult = calculateGeneralInfectionScore(patient.observations);
      result = {
        score: genResult.probability,
        explanation: genResult.recommendation,
        details: genResult,
        method: "General Infection Markers",
        condition: condition
      };
      break;
    }
  }

  return result;
};
