// Discharge instruction generator
//
// Calls are proxied through our own backend (/api/ai/groq) so that
// the Groq API key is never exposed in the browser bundle.
// All functions fall back to rule-based generators on any error.
//
// Grounded generation: the AI is only asked to translate data already in
// our DB into plain English. It is never asked to reason about drug safety,
// invent warnings, or add clinical advice beyond what is passed in the prompt.
// This eliminates the main hallucination surface for a clinical tool.
//
// Reading level: 6th grade — per AMA/Joint Commission/AHRQ recommendation
// for discharge materials. Illness and stress reduce effective reading
// comprehension by 2–3 grade levels, so a patient who normally reads at
// 9th grade reads at ~6th grade at discharge.

import { getDrugDisplayName, antibioticMetadata } from '../data/antibiogram.js';

const GROQ_API_URL = '/api/ai/groq';

const callGroq = async (payload) => {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.choices[0].message.content;
};

// ── Data helpers ──────────────────────────────────────────────────────────────

/**
 * Builds a structured clinical data block for a single medication.
 * This is what gets passed to the AI — not free-form drug knowledge.
 */
const buildMedDataBlock = (med, sideEffectsMap, patientEgfr) => {
  const displayName = getDrugDisplayName(med.drug);
  const sideEffects = sideEffectsMap?.[med.drug];
  const meta = antibioticMetadata[med.drug];

  const commonEffects = sideEffects?.side_effects
    .filter(se => se.frequency === 'very_common' || se.frequency === 'common')
    .slice(0, 3)
    .map(se => `${se.description}${se.pct != null ? ` (affects ~${se.pct}% of people)` : ''}`)
    ?? [];

  const rareEffects = sideEffects?.side_effects
    .filter(se => se.frequency === 'rare')
    .slice(0, 3)
    .map(se => se.description)
    ?? [];

  const needsRenalWarning = meta?.renalAdjustment && patientEgfr != null && patientEgfr < 60;

  const lines = [
    `Drug: ${displayName}`,
    `Purpose: ${med.reason}`,
    `Dose: ${med.dose}`,
    `Frequency: ${med.frequency}`,
  ];

  if (med.duration) lines.push(`Duration: ${med.duration}`);

  if (commonEffects.length > 0) {
    lines.push(`Common side effects (usually resolve on their own): ${commonEffects.join('; ')}`);
  }

  if (rareEffects.length > 0) {
    lines.push(`Rare but serious effects (call doctor or go to ER): ${rareEffects.join('; ')}`);
  }

  if (needsRenalWarning) {
    lines.push(`Kidney note: dose may need adjustment — patient eGFR is ${patientEgfr}`);
  }

  return lines.join('\n');
};

// ── Grounded prompts ──────────────────────────────────────────────────────────

const TRANSLATION_RULES = `
Translation rules (follow exactly):
- Replace ALL medical terms: "renal" → "kidney", "hypertension" → "high blood pressure", "tachycardia" → "fast heartbeat", "edema" → "swelling", "nausea" → "upset stomach or feeling sick", "diarrhea" → "loose stools or diarrhea", "hepatic" → "liver"
- Use body-sensation language: "your ankles get puffy" not "peripheral edema", "you feel your heart racing" not "tachycardia"
- Short sentences only — one idea per sentence
- No hedge phrases like "consult your doctor before" or "as always" unless that specific action is listed in the data
- Do NOT add any warnings, drug interactions, food restrictions, or advice that is not explicitly listed in the data block above
- If a data field is missing, omit it — do not invent a substitute`.trim();

/**
 * Generate simplified medication instructions — grounded in DB data only.
 * @param {object} patient
 * @param {object} sideEffectsMap  — from /api/drugs/side-effects, keyed by drug key
 */
export const generateMedicationInstructions = async (patient, sideEffectsMap = {}) => {
  const allMeds = [...patient.continuingMeds, ...patient.newMeds];
  const egfr = patient.labs?.egfr;

  const medBlocks = allMeds
    .map((med, i) => `--- Medication ${i + 1} ---\n${buildMedDataBlock(med, sideEffectsMap, egfr)}`)
    .join('\n\n');

  const prompt = `You are rewriting clinical medication data into patient-friendly discharge instructions.
Reading level: 6th grade (short words, short sentences).
Patient: ${patient.name}, ${patient.age} years old.
${patient.allergies?.length > 0 ? `Known allergies: ${patient.allergies.map(a => a.substance).join(', ')}` : ''}

IMPORTANT: Use ONLY the facts in the data blocks below. Do not add any information that is not listed.
${TRANSLATION_RULES}

${medBlocks}

Format as a numbered list. Generate an entry for EACH medication listed above — no more, no fewer. Never write "(None listed)" or placeholder text. If a data field is absent for a medication, simply omit that line.

For each medication:
1. **Drug name** — what it is for (one sentence)
2. How to take it (dose, how often, how long if listed)
3. Side effects to watch for (only if listed in the data — split into "Usually fine:" and "Call doctor if:")
4. Missed dose: take it as soon as you remember unless it is almost time for the next dose — never double up

End with one short reminder to finish the full course for any antibiotics listed.`;

  try {
    return await callGroq({
      model: 'llama-3.1-8b-instant',
      max_tokens: 1200,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (error) {
    console.error('Discharge instructions error:', error);
    return generateFallbackInstructions(patient, allMeds, sideEffectsMap);
  }
};

/**
 * Generate follow-up action items — grounded in safety alerts and actual lab values.
 * @param {object} patient
 * @param {Array}  safetyAlerts  — allAlerts from safetyEngine
 */
export const generateFollowUpActions = async (patient, safetyAlerts) => {
  const allMeds = [...patient.continuingMeds, ...patient.newMeds];
  const antibiotics = allMeds.filter(m => antibioticMetadata[m.drug]);
  const egfr = patient.labs?.egfr;
  const potassium = patient.labs?.potassium;

  // Build a structured data block — AI only reformats this, never adds to it
  const alertActions = safetyAlerts
    .filter(a => a.action)
    .map(a => `- ${a.title}: ${a.action}`)
    .join('\n') || '- No safety concerns flagged';

  const labContext = [
    egfr != null ? `eGFR: ${egfr} mL/min${egfr < 60 ? ' (reduced kidney function — monitor)' : ''}` : null,
    potassium != null ? `Potassium: ${potassium} mEq/L${(potassium < 3.5 || potassium > 5.0) ? ' (out of normal range — recheck)' : ''}` : null,
    patient.labs?.creatinine != null ? `Creatinine: ${patient.labs.creatinine}` : null,
  ].filter(Boolean).join('\n');

  const antibiotiCourses = antibiotics.length > 0
    ? antibiotics.map(m => `- ${getDrugDisplayName(m.drug)}: ${m.duration || 'finish full course'}`).join('\n')
    : null;

  const prompt = `You are writing discharge follow-up action items for a patient.
Reading level: 6th grade.
Patient: ${patient.name}, ${patient.age} years old.
Conditions: ${patient.conditions?.join(', ') || 'not specified'}

IMPORTANT: Use ONLY the data below. Do not add recommendations, lab timelines, or referrals not listed here.
${TRANSLATION_RULES}

Lab values at discharge:
${labContext || '- Not available'}

Safety concerns to address (from clinical review):
${alertActions}

${antibiotiCourses ? `Antibiotic courses to complete:\n${antibiotiCourses}` : ''}

Symptoms at discharge: ${patient.symptoms?.map(s => s.symptom).join(', ') || 'none listed'}

Write two sections using checkbox format (☐):

FOR YOU — Patient actions:
(medication reminders, finish antibiotic courses if any, symptoms to watch for based only on the listed safety concerns)

FOR YOUR DOCTOR — Provider follow-up:
(lab monitoring based only on the lab values and safety concerns listed above, medication adjustments listed in the safety actions)

Keep each item to one line. Be specific using the actual values given (e.g. "your eGFR was 42" not "your kidney function").`;

  try {
    return await callGroq({
      model: 'llama-3.1-8b-instant',
      max_tokens: 700,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (error) {
    console.error('Follow-up actions error:', error);
    return generateFallbackFollowUp(patient, safetyAlerts);
  }
};

// ── Fallback generators (rule-based, used when Groq is unavailable) ───────────

const generateFallbackInstructions = (patient, meds, sideEffectsMap = {}) => {
  const lines = [
    `DISCHARGE MEDICATIONS FOR ${patient.name.toUpperCase()}`,
    '',
    'Take these medications exactly as prescribed:',
    '',
  ];

  meds.forEach((med, idx) => {
    const displayName = getDrugDisplayName(med.drug);
    const sideEffects = sideEffectsMap[med.drug];
    const common = sideEffects?.side_effects
      .filter(se => se.frequency === 'very_common' || se.frequency === 'common')
      .slice(0, 2)
      .map(se => se.description) ?? [];
    const serious = sideEffects?.side_effects
      .filter(se => se.frequency === 'rare')
      .slice(0, 2)
      .map(se => se.description) ?? [];

    lines.push(`${idx + 1}. ${displayName} ${med.dose}`);
    lines.push(`   What it is for: ${med.reason}`);
    lines.push(`   How to take: ${med.frequency}${med.duration ? `, for ${med.duration}` : ''}`);
    if (common.length > 0) lines.push(`   May happen: ${common.join(', ')}`);
    if (serious.length > 0) lines.push(`   Call your doctor or go to ER if: ${serious.join(', ')}`);
    lines.push(`   Missed dose: Take it as soon as you remember, unless it is almost time for the next dose. Never double up.`);
    lines.push('');
  });

  const abx = meds.filter(m => antibioticMetadata[m.drug]);
  if (abx.length > 0) {
    lines.push(`Finish the full course of your antibiotic${abx.length > 1 ? 's' : ''} even if you feel better.`);
  }

  return lines.join('\n');
};

const generateFallbackFollowUp = (patient, safetyAlerts) => {
  const lines = ['FOLLOW-UP ACTIONS', '', 'FOR YOU:', '☐ Schedule a follow-up appointment within 2 weeks', '☐ Take all medications as prescribed', ''];

  const allMeds = [...patient.continuingMeds, ...patient.newMeds];
  const abx = allMeds.filter(m => antibioticMetadata[m.drug]);
  abx.forEach(m => {
    lines.push(`☐ Finish your full course of ${getDrugDisplayName(m.drug)}${m.duration ? ` (${m.duration})` : ''}`);
  });

  if (patient.labs?.egfr != null && patient.labs.egfr < 60) {
    lines.push(`☐ Get your kidney function (eGFR) checked — your level was ${patient.labs.egfr} at discharge`);
  }
  if (patient.labs?.potassium != null && (patient.labs.potassium < 3.5 || patient.labs.potassium > 5.0)) {
    lines.push(`☐ Get your potassium level rechecked — your level was ${patient.labs.potassium} at discharge`);
  }

  if (safetyAlerts?.length > 0) {
    lines.push('');
    lines.push('FOR YOUR DOCTOR:');
    safetyAlerts.forEach(alert => {
      if (alert.action) lines.push(`☐ ${alert.action}`);
    });
  }

  return lines.join('\n');
};

export default {
  generateMedicationInstructions,
  generateFollowUpActions,
};
