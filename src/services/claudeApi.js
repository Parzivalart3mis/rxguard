// AI API service for clinical reasoning (Groq + Llama)
//
// Calls are proxied through our own backend (/api/ai/groq) so that
// the Groq API key is never exposed in the browser bundle.
// The backend must be running (npm run server) for AI features to work.
// All functions fall back to rule-based generators on any network/API error.

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

  if (data.error) {
    throw new Error(data.error);
  }

  return data.choices[0].message.content;
};

export const generateClinicalExplanation = async (patient, scoreResult) => {
  try {
    const prompt = `You are a clinical decision support system for antibiotic stewardship.

Given the following patient data:
- Name: ${patient.name}
- Age: ${patient.age}
- Condition: ${patient.conditions.map(c => c.display).join(', ')}
- Key findings: ${patient.observations.map(o => `${o.display}: ${o.value}${o.unit ? ' ' + o.unit : ''}`).join('; ')}
- Allergies: ${patient.allergies.map(a => a.substance).join(', ') || 'None'}

The bacterial infection probability score is ${scoreResult.score}% based on the ${scoreResult.method}.

Provide a 2-3 sentence clinical explanation for why this score was assigned, citing specific data points. Be direct and clinical in tone. Do NOT provide a diagnosis. Do NOT say "I recommend." Use language like "The clinical data suggests..." or "Based on the available evidence..."

Always end with: "Clinical judgment should guide all prescribing decisions."`;

    return await callGroq({
      model: 'llama-3.1-8b-instant',
      max_tokens: 200,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (error) {
    console.error('AI explanation error:', error);
    return generateFallbackExplanation(patient, scoreResult);
  }
};

export const generateRecommendationRationale = async (patient, recommendation, originalChoice) => {
  try {
    const prompt = `You are an antibiotic stewardship advisor.

Patient: ${patient.name}, ${patient.age} years old
Condition: ${patient.conditions.map(c => c.display).join(', ')}
Allergies: ${patient.allergies.map(a => a.substance).join(', ') || 'None'}

The system recommends ${recommendation.name} over ${originalChoice}.

Explain in 2-3 sentences why ${recommendation.name} is preferred, citing:
- Spectrum appropriateness: ${recommendation.spectrum}
- Local resistance data: ${recommendation.resistanceData ? `${recommendation.resistanceData.susceptibility}% susceptibility` : 'No specific data'}
- Patient-specific factors: ${patient.allergies.length > 0 ? 'allergies considered' : 'no allergy concerns'}

Be respectful of physician autonomy. Use phrases like "Consider..." not "You must..."

End with: "Clinical judgment should guide all prescribing decisions."`;

    return await callGroq({
      model: 'llama-3.1-8b-instant',
      max_tokens: 200,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (error) {
    console.error('AI rationale error:', error);
    return generateFallbackRationale(patient, recommendation);
  }
};

export const generateSuboptimalReasoning = async (patient, selectedAntibiotic, selectedAssessment, recommendedAntibiotic) => {
  try {
    const prompt = `You are an antibiotic stewardship advisor reviewing a prescribing decision.

Patient: ${patient.name}, ${patient.age} years old
Condition: ${patient.conditions.map(c => c.display).join(', ')}
Allergies: ${patient.allergies.map(a => a.substance).join(', ') || 'None'}

The physician selected: ${selectedAntibiotic.name} (${selectedAntibiotic.spectrum}-spectrum)
Local susceptibility: ${selectedAssessment.resistanceData ? `${selectedAssessment.resistanceData.susceptibility}% (${selectedAssessment.resistanceData.pathogen})` : 'No local data'}
${selectedAssessment.allergyWarnings?.length > 0 ? `Allergy concerns: ${selectedAssessment.allergyWarnings.join('; ')}` : ''}
${selectedAssessment.recentUseWarning ? `Recent use concern: ${selectedAssessment.recentUseWarning}` : ''}

The system recommends: ${recommendedAntibiotic.name} instead.

In 2-3 sentences, explain specifically why ${selectedAntibiotic.name} is not the optimal choice for this patient and condition. Focus on the weaknesses of the selected drug (e.g. unnecessarily broad spectrum, resistance rates, recent use, allergy risk). Be direct but respectful of physician autonomy. Do NOT recommend the alternative — just explain the concern with the selected drug.

End with: "Clinical judgment should guide all prescribing decisions."`;

    return await callGroq({
      model: 'llama-3.1-8b-instant',
      max_tokens: 200,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (error) {
    console.error('AI suboptimal reasoning error:', error);
    return generateFallbackSuboptimal(selectedAntibiotic, selectedAssessment, recommendedAntibiotic);
  }
};

const generateFallbackExplanation = (patient, scoreResult) => {
  const indicators = scoreResult.details?.indicators || [];
  const indicatorText = indicators.slice(0, 2).join('; ');
  return `The clinical data suggests a bacterial probability of ${scoreResult.score}% based on the ${scoreResult.method}. Key findings include: ${indicatorText || 'available clinical indicators'}. ${scoreResult.explanation} Clinical judgment should guide all prescribing decisions.`;
};

const generateFallbackSuboptimal = (selectedAntibiotic, selectedAssessment, recommendedAntibiotic) => {
  const reasons = [];
  if (selectedAntibiotic.spectrum === 'broad') {
    reasons.push(`${selectedAntibiotic.name} provides broad-spectrum coverage that may be unnecessary for this condition, increasing the risk of collateral resistance`);
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
  const reason = reasons.length > 0 ? reasons.join('; ') + '.' : `${selectedAntibiotic.name} is not the preferred option for this condition based on current stewardship guidelines.`;
  return `${reason} ${recommendedAntibiotic.name} may be a more targeted choice. Clinical judgment should guide all prescribing decisions.`;
};

const generateFallbackRationale = (_patient, recommendation) => {
  return `Consider ${recommendation.name} as the preferred option. It offers ${recommendation.spectrum}-spectrum coverage targeted to typical pathogens for this condition, with ${recommendation.resistanceData?.susceptibility || 'good'}% local susceptibility. Clinical judgment should guide all prescribing decisions.`;
};

export default {
  generateClinicalExplanation,
  generateRecommendationRationale,
  generateSuboptimalReasoning,
};
