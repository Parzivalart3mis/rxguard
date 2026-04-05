// AI API service for clinical reasoning (Groq + Llama)
//
// Every prompt is grounded in guidelines already encoded in the system:
//   - IDSA/SHEA Antibiotic Stewardship (Barlam et al., Clin Infect Dis 2016)
//   - IDSA CAP Guidelines (Metlay et al., AJRCCM 2019)
//   - IDSA SSTI Guidelines (Stevens et al., Clin Infect Dis 2014)
//   - IDSA Rhinosinusitis Guidelines (Chow et al., Clin Infect Dis 2012)
//   - AAFP/AAP AOM Guidelines (2013)
//   - CDC Antibiotic Prescribing and Use (2022 Update)
//   - Modified Centor Score (McIsaac et al., JAMA 1998)
//   - UTI Algorithm (Hooton, NEJM 2012; NHSN data)
//
// Calls are proxied through the Express backend (/api/ai/groq) so the
// Groq API key is never exposed in the browser bundle.
// All functions fall back to rule-based generators on any network/API error.

import { guidelines } from '../data/guidelines.js';
import { determineCondition } from './scoringEngine.js';

const GROQ_API_URL = '/api/ai/groq';

// llama-3.3-70b-versatile is substantially stronger at clinical reasoning
// than the 8b model while remaining available on the Groq free tier.
const MODEL = 'llama-3.3-70b-versatile';

// --------------------------------------------------------------------------
// System prompt — establishes the clinical framework for every call.
// The LLM is instructed to reason *only* from provided context, preventing
// hallucinated statistics or unsupported guideline references.
// --------------------------------------------------------------------------
const CLINICAL_SYSTEM_PROMPT = `You are a clinical decision support system for antibiotic stewardship. Your responses must be grounded in the following evidence-based sources — do not cite any guideline or statistic not present in the patient context or guideline data supplied with each query:

Sources in use:
• IDSA/SHEA Implementing Antibiotic Stewardship Programs — Barlam et al., Clin Infect Dis 2016;62(10):e51–e77
• IDSA Community-Acquired Pneumonia Guidelines — Metlay et al., AJRCCM 2019;200(7):e45–e67
• IDSA Skin and Soft Tissue Infection Guidelines — Stevens et al., Clin Infect Dis 2014;59(2):147–159
• IDSA Rhinosinusitis Guidelines — Chow et al., Clin Infect Dis 2012;54(8):e72–e112
• AAFP/AAP Acute Otitis Media Clinical Practice Guideline — Pediatrics 2013;131(3):e964–e999
• CDC Antibiotic Use in the United States, 2022 Update
• Modified Centor Score — McIsaac et al., JAMA 1998;279(11):883–888
• UTI epidemiology — Hooton, NEJM 2012;366(11):1028–1037; NHSN data

Strict rules:
1. State only what the supplied clinical data and guideline context supports.
2. When referencing a guideline, use the short-form citation (e.g. "Per IDSA 2019 CAP guidelines").
3. Use specific numeric thresholds only from the scoring algorithm output provided (Centor 0–5, PCT cutoffs at 0.1 / 0.25 / 0.5 ng/mL, WBC ×10⁹/L, CRP mg/L).
4. Do NOT fabricate susceptibility percentages, resistance rates, or prevalence figures — use only values provided in the patient context.
5. Be concise (2–3 sentences), direct, and clinical in tone.
6. End every response with: "Clinical judgment should guide all prescribing decisions."`;

// --------------------------------------------------------------------------
// Build a structured guideline context block for a given condition key.
// Pulls from the same guidelines object used by the recommendation engine,
// ensuring AI reasoning and rule-based logic reference the same evidence.
// --------------------------------------------------------------------------
const buildGuidelineContext = (conditionKey) => {
  if (!conditionKey) return '';
  const g = guidelines.conditions[conditionKey];
  if (!g) return '';

  const lines = [`Guideline context (${g.name}):`];
  if (g.firstLine.length)
    lines.push(`  First-line agents: ${g.firstLine.join(', ')}`);
  if (g.alternatives.length)
    lines.push(`  Alternatives: ${g.alternatives.join(', ')}`);
  if (g.typicalPathogens.length) {
    const pathogens = g.typicalPathogens
      .map(p => `${p.pathogen} (${Math.round(p.weight * 100)}% prevalence)`)
      .join(', ');
    lines.push(`  Typical pathogens: ${pathogens}`);
  }
  if (g.duration)
    lines.push(`  Standard duration: ${g.duration}`);
  if (g.notes)
    lines.push(`  Guideline note: ${g.notes}`);
  return lines.join('\n');
};

// --------------------------------------------------------------------------
// Core fetch helper — uses system + user message format so the LLM always
// reasons inside the clinical framework established above.
// --------------------------------------------------------------------------
const callGroq = async (messages, maxTokens = 220) => {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature: 0.2,   // low temperature → consistent, conservative clinical output
      messages,
    }),
  });

  if (!response.ok) throw new Error(`Backend returned ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.choices[0].message.content;
};

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * Explains why the bacterial probability score was assigned for this patient.
 * Grounds the explanation in the validated scoring algorithm and guideline
 * thresholds, citing actual lab values from the patient record.
 */
export const generateClinicalExplanation = async (patient, scoreResult) => {
  try {
    // scoreResult.condition comes from calculateBacterialProbability()
    const guidelineCtx = buildGuidelineContext(scoreResult.condition);

    const userMessage = `Patient: ${patient.name}, ${patient.age}y, ${patient.sex || ''}
Condition: ${patient.conditions.map(c => c.display).join(', ')}
Key findings: ${patient.observations.map(o => `${o.display}: ${o.value}${o.unit ? ' ' + o.unit : ''}`).join('; ')}
Allergies: ${patient.allergies.map(a => a.substance).join(', ') || 'None'}

Scoring method: ${scoreResult.method}
Result: ${scoreResult.score}% bacterial probability
Algorithm output: ${scoreResult.explanation}
Contributing indicators: ${scoreResult.details?.indicators?.join('; ') || 'None recorded'}

${guidelineCtx}

In 2–3 sentences, explain why the ${scoreResult.method} assigned a ${scoreResult.score}% bacterial probability for this patient. Cite the specific indicators listed above and the algorithm thresholds. Reference the guideline context where relevant. Do NOT provide a diagnosis or say "I recommend."`;

    return await callGroq([
      { role: 'system', content: CLINICAL_SYSTEM_PROMPT },
      { role: 'user',   content: userMessage },
    ]);
  } catch (error) {
    console.error('AI explanation error:', error);
    return generateFallbackExplanation(patient, scoreResult);
  }
};

/**
 * Explains why the guideline-recommended antibiotic is the preferred choice
 * for this specific patient, citing spectrum, local susceptibility, and
 * patient-specific factors.
 */
export const generateRecommendationRationale = async (patient, recommendation, originalChoice) => {
  try {
    // Derive condition from the patient so we can pull guideline context
    // without requiring callers to pass it explicitly.
    const conditionKey = determineCondition(patient);
    const guidelineCtx = buildGuidelineContext(conditionKey);

    const userMessage = `Patient: ${patient.name}, ${patient.age}y
Condition: ${patient.conditions.map(c => c.display).join(', ')}
Allergies: ${patient.allergies.map(a => a.substance).join(', ') || 'None'}

${guidelineCtx}

Guideline-recommended agent: ${recommendation.name}
Spectrum category: ${recommendation.spectrum}
Local susceptibility: ${recommendation.resistanceData
  ? `${recommendation.resistanceData.susceptibility}% susceptibility for ${recommendation.resistanceData.pathogen}`
  : 'No local susceptibility data available'}
Stewardship score: ${recommendation.stewardshipScore || 'preferred'}
Physician-selected alternative: ${originalChoice}

In 2–3 sentences, explain why ${recommendation.name} is the preferred agent per guidelines for this patient and condition. Cite spectrum appropriateness relative to typical pathogens, the local susceptibility figure above (if available), and any patient-specific factors. Use collaborative language ("Consider…" not "You must…").`;

    return await callGroq([
      { role: 'system', content: CLINICAL_SYSTEM_PROMPT },
      { role: 'user',   content: userMessage },
    ]);
  } catch (error) {
    console.error('AI rationale error:', error);
    return generateFallbackRationale(patient, recommendation);
  }
};

/**
 * Explains the specific clinical concerns with a non-recommended antibiotic
 * selection, grounded in spectrum stewardship principles, local resistance
 * data, and any allergy or recent-use flags for this patient.
 */
export const generateSuboptimalReasoning = async (patient, selectedAntibiotic, selectedAssessment, recommendedAntibiotic) => {
  try {
    const conditionKey = determineCondition(patient);
    const guidelineCtx = buildGuidelineContext(conditionKey);

    const userMessage = `Patient: ${patient.name}, ${patient.age}y
Condition: ${patient.conditions.map(c => c.display).join(', ')}
Allergies: ${patient.allergies.map(a => a.substance).join(', ') || 'None'}

${guidelineCtx}

Selected drug: ${selectedAntibiotic.name} (${selectedAntibiotic.spectrum}-spectrum)
Local susceptibility for selected drug: ${selectedAssessment.resistanceData
  ? `${selectedAssessment.resistanceData.susceptibility}% susceptibility for ${selectedAssessment.resistanceData.pathogen}`
  : 'No local data'}${selectedAssessment.allergyWarnings?.length > 0
  ? `\nAllergy flags: ${selectedAssessment.allergyWarnings.join('; ')}`
  : ''}${selectedAssessment.recentUseWarning
  ? `\nRecent use flag: ${selectedAssessment.recentUseWarning}`
  : ''}
Guideline-preferred agent: ${recommendedAntibiotic.name}

In 2–3 sentences, explain specifically why ${selectedAntibiotic.name} is not the optimal choice for this patient, referencing the guideline context above. Focus on the drug's stewardship concerns (spectrum breadth, resistance rates, allergy risk, or recent use). Do NOT recommend the alternative — only state the concern with the selected drug.`;

    return await callGroq([
      { role: 'system', content: CLINICAL_SYSTEM_PROMPT },
      { role: 'user',   content: userMessage },
    ]);
  } catch (error) {
    console.error('AI suboptimal reasoning error:', error);
    return generateFallbackSuboptimal(selectedAntibiotic, selectedAssessment, recommendedAntibiotic);
  }
};

// --------------------------------------------------------------------------
// Rule-based fallbacks — used when API key is absent or any call fails.
// These mirror the logic the LLM would produce, ensuring consistent UX.
// --------------------------------------------------------------------------

const generateFallbackExplanation = (patient, scoreResult) => {
  const indicators = scoreResult.details?.indicators || [];
  const indicatorText = indicators.slice(0, 2).join('; ');
  return `The clinical data suggests a bacterial probability of ${scoreResult.score}% based on the ${scoreResult.method}. Key findings include: ${indicatorText || 'available clinical indicators'}. ${scoreResult.explanation} Clinical judgment should guide all prescribing decisions.`;
};

const generateFallbackSuboptimal = (selectedAntibiotic, selectedAssessment, recommendedAntibiotic) => {
  const reasons = [];
  if (selectedAntibiotic.spectrum === 'broad') {
    reasons.push(`${selectedAntibiotic.name} provides broad-spectrum coverage that may be unnecessary for this condition, increasing collateral resistance risk per IDSA stewardship principles`);
  }
  if (selectedAssessment.resistanceData && selectedAssessment.resistanceData.resistance > 20) {
    reasons.push(`local resistance to ${selectedAntibiotic.name} is ${selectedAssessment.resistanceData.resistance}%, which may reduce treatment efficacy`);
  }
  if (selectedAssessment.allergyWarnings?.length > 0) {
    reasons.push(selectedAssessment.allergyWarnings[0]);
  }
  if (selectedAssessment.recentUseWarning) {
    reasons.push(selectedAssessment.recentUseWarning);
  }
  const reason = reasons.length > 0
    ? reasons.join('; ') + '.'
    : `${selectedAntibiotic.name} is not the preferred option for this condition based on current stewardship guidelines.`;
  return `${reason} ${recommendedAntibiotic.name} may be a more targeted choice. Clinical judgment should guide all prescribing decisions.`;
};

const generateFallbackRationale = (_patient, recommendation) => {
  return `Consider ${recommendation.name} as the preferred option per stewardship guidelines. It offers ${recommendation.spectrum}-spectrum coverage targeted to typical pathogens for this condition, with ${recommendation.resistanceData?.susceptibility ?? 'favourable'}% local susceptibility. Clinical judgment should guide all prescribing decisions.`;
};

export default {
  generateClinicalExplanation,
  generateRecommendationRationale,
  generateSuboptimalReasoning,
};
