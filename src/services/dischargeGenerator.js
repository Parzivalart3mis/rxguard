// Discharge instruction generator
//
// Calls are proxied through our own backend (/api/ai/groq) so that
// the Groq API key is never exposed in the browser bundle.
// All functions fall back to rule-based generators on any error.

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

/**
 * Generate simplified medication instructions
 */
export const generateMedicationInstructions = async (patient) => {
  const allMeds = [...patient.continuingMeds, ...patient.newMeds];

  const prompt = `You are writing discharge medication instructions for a patient.
The patient has no medical background. Write at a 6th-grade reading level.
For each medication, provide:
1. Drug name (brand and generic) and what it's for (in simple terms)
2. How to take it (dose, frequency, with/without food, time of day)
3. Important warnings in one sentence
4. What to do if you miss a dose

Patient: ${patient.name}, ${patient.age} years old
Allergies: ${patient.allergies.map(a => a.substance).join(', ') || 'None'}

Medications:
${allMeds.map(med => `- ${med.drug} ${med.dose} ${med.frequency} (${med.reason})`).join('\n')}

Format as a clean, numbered list. No medical jargon.
Use language like "blood pressure pill" not "antihypertensive."`;

  try {
    return await callGroq({
      model: 'llama-3.1-8b-instant',
      max_tokens: 800,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (error) {
    console.error('Discharge instructions error:', error);
    return generateFallbackInstructions(patient, allMeds);
  }
};

/**
 * Generate follow-up action items
 */
export const generateFollowUpActions = async (patient, safetyAlerts) => {
  const prompt = `Generate follow-up action items for a patient being discharged.

Patient: ${patient.name}, ${patient.age} years old
Conditions: ${patient.conditions.join(', ')}
eGFR: ${patient.labs.egfr} mL/min

Active symptoms: ${patient.symptoms.map(s => s.symptom).join(', ')}

Safety concerns identified:
${safetyAlerts.map(a => `- ${a.title}: ${a.action}`).join('\n')}

Create two sections:
FOR YOU (patient actions):
- Checklist items the patient should do
- Include medication-related actions
- Include follow-up appointments needed

FOR YOUR DOCTOR (provider follow-up):
- Lab monitoring needed
- Medication adjustments to consider
- When to reassess therapy

Use checkbox format (☐). Be specific and actionable.`;

  try {
    return await callGroq({
      model: 'llama-3.1-8b-instant',
      max_tokens: 600,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (error) {
    console.error('Follow-up actions error:', error);
    return generateFallbackFollowUp(patient, safetyAlerts);
  }
};

/**
 * Generate ADE warning cards
 */
export const generateADECards = async (patient, adeAlerts) => {
  if (adeAlerts.length === 0) {
    return generateFallbackADECards(patient, adeAlerts);
  }

  const prompt = `For each of the following medications with potential side effects, generate a "Watch-Out Card".
Split symptoms into two groups:

🔴 CALL YOUR DOCTOR OR GO TO THE ER IF:
(serious but rare side effects)

🟡 THESE MAY HAPPEN AND USUALLY GO AWAY:
(common, expected side effects)

Write at a 6th-grade reading level. Use body-sensation language:
"your ankles get puffy" not "peripheral edema"
"you feel your heart racing" not "tachycardia"

Patient: ${patient.age} years old, eGFR ${patient.labs.egfr}

Potential drug-symptom associations:
${adeAlerts.map(a => `- ${a.topMatch.drug}: ${a.topMatch.sideEffect.description} (${a.topMatch.score}% probability)`).join('\n')}

Format clearly with emojis and bullet points.`;

  try {
    return await callGroq({
      model: 'llama-3.1-8b-instant',
      max_tokens: 600,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (error) {
    console.error('ADE cards error:', error);
    return generateFallbackADECards(patient, adeAlerts);
  }
};

// ── fallback generators ───────────────────────────────────────────────────────

const generateFallbackInstructions = (patient, meds) => {
  const lines = [
    `DISCHARGE MEDICATIONS FOR ${patient.name.toUpperCase()}`,
    '',
    'Take these medications exactly as prescribed:',
    '',
  ];

  meds.forEach((med, idx) => {
    const simpleName = getSimpleDrugName(med.drug);
    lines.push(`${idx + 1}. ${med.drug.toUpperCase()} ${med.dose}`);
    lines.push(`   What it's for: ${simpleName}`);
    lines.push(`   How to take: ${med.frequency}`);
    lines.push(`   ${med.duration ? `Take for ${med.duration}. ` : ''}Take with food if stomach upset.`);
    lines.push(`   ⚠️ Do not stop taking without talking to your doctor.`);
    lines.push('');
  });

  lines.push('If you miss a dose:');
  lines.push('- Take it as soon as you remember, unless it is almost time for your next dose');
  lines.push('- Never double up on doses');
  lines.push('');
  lines.push('Call your doctor if you have questions or concerns.');

  return lines.join('\n');
};

const generateFallbackFollowUp = (patient, safetyAlerts) => {
  const lines = [
    'FOLLOW-UP ACTIONS',
    '',
    'FOR YOU:',
    '☐ Schedule follow-up appointment within 2 weeks',
    '☐ Take all medications as prescribed',
    '',
  ];

  if (patient.labs.egfr < 60) {
    lines.push('☐ Get blood work in 7 days (kidney function and potassium)');
  }

  if (safetyAlerts.some(a => a.type === 'ade')) {
    lines.push('☐ Watch for side effects and report any concerns');
  }

  lines.push('');
  lines.push('FOR YOUR DOCTOR:');

  safetyAlerts.forEach(alert => {
    lines.push(`☐ ${alert.action}`);
  });

  return lines.join('\n');
};

const generateFallbackADECards = (_patient, adeAlerts) => {
  if (adeAlerts.length === 0) return 'No adverse drug events detected.';

  const lines = ['WATCH-OUT SYMPTOMS:\n'];

  adeAlerts.forEach(alert => {
    lines.push(`${alert.topMatch.drug.toUpperCase()}:`);
    lines.push(`🔴 Call doctor if: ${alert.topMatch.sideEffect.description} is severe`);
    lines.push(`🟡 Common: ${alert.topMatch.sideEffect.description} affects ${alert.topMatch.sideEffect.pct}% of people`);
    lines.push('');
  });

  return lines.join('\n');
};

const getSimpleDrugName = (drug) => {
  const mappings = {
    lisinopril:         'Blood pressure pill',
    amlodipine:         'Blood pressure pill',
    metoprolol:         'Blood pressure pill',
    metformin:          'Diabetes pill',
    atorvastatin:       'Cholesterol pill',
    omeprazole:         'Heartburn pill',
    sertraline:         'Mood pill',
    furosemide:         'Water pill',
    warfarin:           'Blood thinner',
    amoxicillin:        'Antibiotic',
    azithromycin:       'Antibiotic',
    nitrofurantoin:     'Antibiotic',
    ibuprofen:          'Pain pill',
    potassium_chloride: 'Potassium supplement',
  };
  return mappings[drug] || drug;
};

export default {
  generateMedicationInstructions,
  generateFollowUpActions,
  generateADECards,
};
