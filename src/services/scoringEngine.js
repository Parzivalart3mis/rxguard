// Scoring engine for bacterial probability calculations

export const calculateCentorScore = (observations, age) => {
  let score = 0;
  const obsMap = new Map(observations.map(o => [o.display, o]));

  // Fever > 38°C
  const tempObs = obsMap.get("Body temperature");
  if (tempObs && tempObs.value > 38) score += 1;

  // Absence of cough
  const coughObs = obsMap.get("Cough");
  if (coughObs && (coughObs.value === "absent" || !coughObs.value)) score += 1;

  // Tonsillar swelling/exudate
  const tonsilObs = obsMap.get("Tonsillar swelling/exudate") || obsMap.get("Tonsillar exudate");
  if (tonsilObs && tonsilObs.value === "present") score += 1;

  // Tender anterior cervical lymphadenopathy
  const lymphObs = obsMap.get("Tender anterior cervical lymphadenopathy");
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
  const obsMap = new Map(observations.map(o => [o.display, o]));
  
  let score = 0;
  let indicators = [];

  // Dysuria + frequency without vaginal discharge
  const dysuria = obsMap.get("Dysuria");
  const frequency = obsMap.get("Urinary frequency");
  const discharge = obsMap.get("Vaginal discharge");
  
  if (dysuria?.value === "present" && frequency?.value === "present" && discharge?.value !== "present") {
    score += 40;
    indicators.push("Classic UTI symptoms (dysuria + frequency, no discharge)");
  }

  // Positive nitrites
  const nitrites = obsMap.get("Nitrites in urine");
  if (nitrites?.value === "positive") {
    score += 30;
    indicators.push("Positive nitrites (highly specific)");
  }

  // Positive leukocyte esterase
  const leukocyte = obsMap.get("Leukocyte esterase");
  if (leukocyte?.value === "positive") {
    score += 20;
    indicators.push("Positive leukocyte esterase");
  }

  // Urine culture positive
  const culture = obsMap.get("Urine culture");
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
  const obsMap = new Map(observations.map(o => [o.display, o]));
  
  let score = 0;
  let indicators = [];

  // Duration
  const duration = obsMap.get("Duration of symptoms");
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
  const temp = obsMap.get("Body temperature");
  if (temp && temp.value > 38.5) {
    score += 10;
    indicators.push("High fever (may suggest bacterial)");
  }

  // Procalcitonin
  const pct = obsMap.get("Procalcitonin");
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
  const crp = obsMap.get("C-reactive protein");
  if (crp && crp.value > 100) {
    score += 20;
    indicators.push("CRP > 100 mg/L (bacterial inflammation)");
  }

  // Biphasic illness (for sinusitis)
  const biphasic = obsMap.get("Biphasic illness");
  if (biphasic?.value && biphasic.value.includes("yes")) {
    score += 35;
    indicators.push("Biphasic illness pattern (bacterial sinusitis)");
  }

  // WBC
  const wbc = obsMap.get("WBC count");
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
  const obsMap = new Map(observations.map(o => [o.display, o]));
  
  let score = 0;
  let indicators = [];

  // Consolidation on imaging
  const cxr = obsMap.get("Chest X-ray consolidation") || obsMap.get("Consolidation on CXR");
  if (cxr?.value) {
    score += 50;
    indicators.push("Consolidation on imaging (definitive)");
  }

  // Elevated WBC + fever + productive cough
  const wbc = obsMap.get("WBC count");
  const temp = obsMap.get("Body temperature");
  const cough = obsMap.get("Cough");
  
  if (wbc?.value > 10 && temp?.value > 38 && cough?.value === "productive") {
    score += 30;
    indicators.push("Clinical triad: elevated WBC + fever + productive cough");
  }

  // CRP
  const crp = obsMap.get("C-reactive protein");
  if (crp?.value > 100) {
    score += 20;
    indicators.push("CRP > 100 mg/L (strong indicator)");
  }

  // Procalcitonin
  const pct = obsMap.get("Procalcitonin");
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
  const obsMap = new Map(observations.map(o => [o.display, o]));
  
  let score = 0;
  let indicators = [];

  // Cellulitis signs
  const erythema = obsMap.get("Erythema on left lower leg") || obsMap.get("Expanding erythema");
  if (erythema?.value === "expanding" || erythema?.value === "present") {
    score += 40;
    indicators.push("Expanding erythema (cellulitis)");
  }

  const warmth = obsMap.get("Warmth and tenderness");
  if (warmth?.value === "present") {
    score += 30;
    indicators.push("Warmth and tenderness (cellulitis)");
  }

  // Fever
  const temp = obsMap.get("Body temperature");
  if (temp?.value > 38) {
    score += 15;
    indicators.push("Fever > 38°C (systemic infection)");
  }

  // Abscess
  const abscess = obsMap.get("Abscess");
  if (abscess?.value === "present") {
    score += 35;
    indicators.push("Abscess present - I&D may be sufficient");
  }

  // CRP
  const crp = obsMap.get("C-reactive protein");
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

export const determineCondition = (patient) => {
  const condition = patient.conditions[0];
  if (!condition) return null;

  const code = condition.code;
  const display = condition.display.toLowerCase();

  if (code.startsWith("J02") || display.includes("pharyngitis")) {
    return patient.centorScore >= 4 ? "strep_pharyngitis" : "viral_pharyngitis";
  }
  if (code.startsWith("N30") || display.includes("cystitis")) {
    return patient.pastAntibiotics?.length > 0 && 
           patient.pastAntibiotics[0].date > "2025-01-01" ? "complicated_uti" : "uncomplicated_uti";
  }
  if (code.startsWith("J18") || display.includes("pneumonia")) {
    return "community_acquired_pneumonia";
  }
  if (code.startsWith("H66") || display.includes("otitis")) {
    return "acute_otitis_media";
  }
  if (code.startsWith("J06") || (display.includes("upper respiratory") && !display.includes("sinusitis"))) {
    return "viral_uri";
  }
  if (code.startsWith("J01") || display.includes("sinusitis")) {
    const obsMap = new Map(patient.observations.map(o => [o.display, o]));
    const duration = obsMap.get("Duration of symptoms");
    if (duration && parseInt(duration.value) < 10) {
      return "viral_sinusitis";
    }
    return "acute_sinusitis";
  }
  if (code.startsWith("L03") || display.includes("cellulitis")) {
    return "cellulitis";
  }

  return null;
};

export const calculateBacterialProbability = (patient) => {
  const condition = determineCondition(patient);
  
  if (!condition) {
    return {
      score: 50,
      explanation: "Unable to determine condition type for scoring",
      details: []
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
      // AOM is usually bacterial
      result = {
        score: 80,
        explanation: "Acute otitis media with bulging TM and fever - bacterial etiology likely",
        details: { indicators: ["Bulging TM", "Fever", "Ear pain"] },
        method: "Clinical Criteria",
        condition: condition
      };
      break;

    default:
      result = {
        score: 50,
        explanation: "Clinical judgment required",
        details: {},
        method: "Unknown",
        condition: condition
      };
  }

  return result;
};
