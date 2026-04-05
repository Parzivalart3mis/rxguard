/**
 * sideEffectsFetcher.js
 *
 * Two-phase approach:
 *
 * Phase 1 — Regex extraction (deterministic, no LLM):
 *   Parses the FDA adverse_reactions label text for structured patterns:
 *   - "symptom (X%)" inline percentages
 *   - Frequency-tier headers: "Very common (≥10%): nausea, vomiting"
 *   - "X% of patients experienced symptom"
 *   Produces: { symptom, frequency, pct } — no hallucination risk.
 *
 * Phase 2 — Groq description-only (grounded generation):
 *   Given the regex-extracted list of (symptom, frequency) pairs, asks Groq
 *   ONLY to write a patient-friendly 1-sentence description per symptom.
 *   Groq is not asked to infer frequency, pct, or add any new side effects.
 *   This is translation, not reasoning — low hallucination risk.
 *
 * Fallback: if regex yields < 3 results (label uses unusual prose format),
 *   falls back to the original full Groq parse.
 *
 * TTL: 90 days — FDA labels change on the order of months, not weeks.
 *   Re-parsing monthly with an LLM was unnecessary and introduced data drift.
 */

import db from '../db/client.js';

const OPENFDA_URL  = 'https://api.fda.gov/drug/label.json';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TTL_DAYS     = 90;

const OPENFDA_SUBSTANCE = {
  // Antibiotics
  tmp_smx:            'sulfamethoxazole',
  amoxicillin_clav:   'amoxicillin',
  penicillin:         'penicillin v potassium',
  doxycycline:        'doxycycline hyclate',
  dicloxacillin:      'dicloxacillin sodium',
  clindamycin:        'clindamycin hydrochloride',
  fosfomycin:         'fosfomycin tromethamine',
  nitrofurantoin:     'nitrofurantoin',
  cephalexin:         'cephalexin',
  ciprofloxacin:      'ciprofloxacin',
  levofloxacin:       'levofloxacin',
  azithromycin:       'azithromycin',
  amoxicillin:        'amoxicillin',
  // Cardiovascular / chronic meds
  lisinopril:         'lisinopril',
  amlodipine:         'amlodipine besylate',
  metoprolol:         'metoprolol tartrate',
  atorvastatin:       'atorvastatin',
  furosemide:         'furosemide',
  warfarin:           'warfarin sodium',
  // Metabolic / GI
  metformin:          'metformin hydrochloride',
  omeprazole:         'omeprazole',
  // CNS / pain
  sertraline:         'sertraline hydrochloride',
  ibuprofen:          'ibuprofen',
  // Other
  potassium_chloride: 'potassium chloride',
  birth_control:      null,
};

// ── helpers ────────────────────────────────────────────────────────────────────

const isStale = (cachedAt) => {
  if (!cachedAt) return true;
  const age = (Date.now() - new Date(cachedAt).getTime()) / (1000 * 60 * 60 * 24);
  return age > TTL_DAYS;
};

const keyToSubstanceName = (key) =>
  key in OPENFDA_SUBSTANCE ? OPENFDA_SUBSTANCE[key] : key.replace(/_/g, ' ');

const keyToDisplayName = (key) => key.replace(/_/g, ' ');

const pctToFrequency = (pct) => {
  if (pct >= 10)  return 'very_common';
  if (pct >= 1)   return 'common';
  if (pct >= 0.1) return 'uncommon';
  return 'rare';
};

const cleanSymptom = (raw) =>
  raw
    .toLowerCase()
    .replace(/[^a-z\s\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// ── Phase 1: regex extraction ──────────────────────────────────────────────────

/**
 * Deterministic extraction of (symptom, frequency, pct) from FDA label prose.
 * Handles three common FDA adverse_reactions formats:
 *   1. Inline pct:  "nausea (25%)", "diarrhea (10.5%)"
 *   2. Tier headers: "Very common (≥10%): nausea, vomiting"
 *   3. Pct-before:  "25% of patients experienced nausea"
 *
 * Returns up to 12 effects sorted by pct desc (nulls last, then by tier).
 * No LLM involved — zero hallucination risk for frequency/pct fields.
 */
function extractStructuredEffects(text) {
  const effects = new Map(); // symptom key → { frequency, pct }

  const addEffect = (symptom, frequency, pct) => {
    const key = cleanSymptom(symptom);
    if (key.length < 3 || key.length > 50) return;
    // Skip non-symptom words that regex can accidentally pick up
    const SKIP = new Set(['patients', 'subjects', 'incidence', 'trial', 'study', 'treatment', 'therapy', 'placebo', 'dose', 'drug']);
    if (SKIP.has(key)) return;
    // Prefer data with a pct over tier-only data
    if (!effects.has(key) || (pct != null && effects.get(key).pct == null)) {
      effects.set(key, { frequency, pct });
    }
  };

  // --- Format 1: "symptom (X%)" ---
  // Matches: "nausea (25%)", "upper respiratory tract infection (≥10%)"
  const inlinePct = /\b([a-z][a-z\s\-\/]{1,35}?)\s*\((?:[≥>~]|approximately\s+)?(\d+(?:\.\d+)?)\s*%\)/gi;
  let m;
  while ((m = inlinePct.exec(text)) !== null) {
    const symptom = cleanSymptom(m[1]);
    const pct = parseFloat(m[2]);
    if (symptom && !isNaN(pct) && pct > 0 && pct <= 100) {
      addEffect(symptom, pctToFrequency(pct), pct);
    }
  }

  // --- Format 2: Frequency-tier headers ---
  // Matches: "Very Common (≥10%): nausea, vomiting, diarrhea"
  //          "Rare (<0.1%): Stevens-Johnson syndrome"
  const tierDefs = [
    { re: /very\s+common[^:\n]{0,40}[:\*]\s*([^\n]{3,300})/gi,            freq: 'very_common' },
    { re: /(?<!\bvery\s)\bcommon[^:\n]{0,40}[:\*]\s*([^\n]{3,300})/gi,    freq: 'common'      },
    { re: /uncommon[^:\n]{0,40}[:\*]\s*([^\n]{3,300})/gi,                 freq: 'uncommon'    },
    { re: /\brare(?:\s+but\s+serious)?[^:\n]{0,40}[:\*]\s*([^\n]{3,300})/gi, freq: 'rare'    },
  ];

  for (const { re, freq } of tierDefs) {
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      const items = m[1].split(/[,;]|\band\b/i);
      for (const item of items) {
        // Strip nested parens (e.g. "diarrhea (including severe diarrhea)")
        const cleaned = cleanSymptom(item.replace(/\([^)]*\)/g, ''));
        if (cleaned.length >= 3 && cleaned.length <= 50) {
          addEffect(cleaned, freq, null);
        }
      }
    }
  }

  // --- Format 3: "X% of patients experienced symptom" ---
  const pctBefore = /(\d+(?:\.\d+)?)\s*%\s+(?:of (?:patients|subjects)\s+)?(?:experienced|reported|had|developed|showed)\s+([a-z][a-z\s\-]{2,35})/gi;
  while ((m = pctBefore.exec(text)) !== null) {
    const pct = parseFloat(m[1]);
    const symptom = cleanSymptom(m[2]);
    if (symptom && !isNaN(pct) && pct > 0 && pct <= 100 && symptom.length >= 3) {
      addEffect(symptom, pctToFrequency(pct), pct);
    }
  }

  const FREQ_ORDER = { very_common: 0, common: 1, uncommon: 2, rare: 3 };

  return [...effects.entries()]
    .map(([symptom, { frequency, pct }]) => ({ symptom, frequency, pct }))
    .sort((a, b) => {
      if (a.pct != null && b.pct != null) return b.pct - a.pct;
      if (a.pct != null) return -1;
      if (b.pct != null) return 1;
      return (FREQ_ORDER[a.frequency] ?? 4) - (FREQ_ORDER[b.frequency] ?? 4);
    })
    .slice(0, 12);
}

// ── Phase 2: Groq description-only ────────────────────────────────────────────

/**
 * Given a pre-extracted list of (symptom, frequency, pct), asks Groq ONLY to
 * write a patient-friendly 1-sentence description for each symptom name.
 * Groq cannot hallucinate frequency or pct — it is not asked for them.
 */
async function generateDescriptions(drugKey, extractedEffects) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const effectsList = extractedEffects
    .map(e => `- ${e.symptom}`)
    .join('\n');

  const prompt = `You are a medical writer. For each side effect of "${keyToDisplayName(drugKey)}" listed below, write a patient-friendly 1-sentence description of what the patient will physically feel or notice.

Rules:
- Describe the physical sensation or visible sign only
- 6th grade reading level — short words, short sentence
- Replace medical terms: "nausea" → "feeling sick to your stomach", "tachycardia" → "feeling your heart beat faster than normal", "edema" → "swelling", "pruritus" → "itching", "erythema" → "skin redness"
- Do NOT add causes, frequency, severity, management advice, or anything not implied by the symptom name
- Return ONLY a JSON array, no markdown:
[{ "symptom": "exact name from input", "description": "one patient-friendly sentence" }]

Side effects to describe:
${effectsList}`;

  let res;
  for (let attempt = 1; attempt <= 3; attempt++) {
    res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
        temperature: 0.1,
      }),
    });
    if (res.status !== 429) break;
    const wait = attempt * 10000;
    console.warn(`[sideEffectsFetcher] Groq 429 for "${drugKey}", retrying in ${wait / 1000}s (attempt ${attempt}/3)`);
    await new Promise(r => setTimeout(r, wait));
  }

  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '';
  const cleaned = raw.replace(/```json|```/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Recover truncated JSON
    const lastBrace = cleaned.lastIndexOf('}');
    try { parsed = JSON.parse(cleaned.slice(0, lastBrace + 1) + ']'); }
    catch { parsed = []; }
  }

  // Merge descriptions back into extracted effects
  const descMap = new Map(parsed.map(p => [p.symptom?.toLowerCase(), p.description]));

  return extractedEffects.map(e => ({
    symptom:     e.symptom,
    frequency:   e.frequency,
    pct:         e.pct,
    onset:       null,
    description: descMap.get(e.symptom.toLowerCase()) ?? `You may notice ${e.symptom}.`,
  }));
}

// ── Fallback: full Groq parse (when regex yields < 3 results) ──────────────────

async function fullGroqParse(drugKey, labelText) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const prompt = `You are a clinical pharmacist. Extract structured side effect data from this FDA drug label text for "${keyToSubstanceName(drugKey) ?? keyToDisplayName(drugKey)}".

Return ONLY a JSON array (no markdown) of up to 10 side effects:
[{
  "symptom": "short name in lowercase",
  "frequency": "very_common" | "common" | "uncommon" | "rare",
  "pct": number or null,
  "onset": "e.g. hours, days" or null,
  "description": "patient-friendly 1-sentence explanation at 6th grade level"
}]

Frequency scale: very_common >10%, common 1-10%, uncommon 0.1-1%, rare <0.1%.
If frequency is not stated, use "uncommon". Include most clinically significant effects.

FDA label text:
${labelText.slice(0, 3000)}`;

  let res;
  for (let attempt = 1; attempt <= 3; attempt++) {
    res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
        temperature: 0.1,
      }),
    });
    if (res.status !== 429) break;
    await new Promise(r => setTimeout(r, attempt * 10000));
  }

  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '';
  const cleaned = raw.replace(/```json|```/g, '').trim();

  let parsed;
  try { parsed = JSON.parse(cleaned); }
  catch {
    const lastBrace = cleaned.lastIndexOf('}');
    try { parsed = JSON.parse(cleaned.slice(0, lastBrace + 1) + ']'); }
    catch { parsed = []; }
  }

  const VALID_FREQUENCIES = new Set(['very_common', 'common', 'uncommon', 'rare']);
  return parsed.filter(
    se => typeof se.symptom === 'string' && VALID_FREQUENCIES.has(se.frequency) && typeof se.description === 'string'
  );
}

// ── OpenFDA label fetch ────────────────────────────────────────────────────────

async function fetchOpenFDALabel(drugKey) {
  const substance = keyToSubstanceName(drugKey);
  if (!substance) return null;

  const strategies = [
    `openfda.substance_name:"${substance.toUpperCase()}"`,
    `openfda.generic_name:"${substance}"`,
    `openfda.substance_name:"${substance.split(' ')[0].toUpperCase()}"`,
  ];

  for (const search of strategies) {
    try {
      const url = `${OPENFDA_URL}?search=${encodeURIComponent(search)}&limit=1`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const result = data?.results?.[0];
      if (!result) continue;

      return {
        adverseReactions: result.adverse_reactions?.[0] ?? null,
        warnings:         result.warnings?.[0] ?? null,
        drugClass:        result.openfda?.pharm_class_cs?.[0] ?? result.openfda?.pharm_class_epc?.[0] ?? null,
      };
    } catch {
      continue;
    }
  }
  return null;
}

// ── DB helpers ─────────────────────────────────────────────────────────────────

function ensureDrugRow(drugKey, drugClass) {
  db.prepare(`
    INSERT OR IGNORE INTO drugs (internal_key, display_name, drug_class, source)
    VALUES (@key, @name, @class, 'openfda')
  `).run({ key: drugKey, name: keyToDisplayName(drugKey), class: drugClass ?? null });
}

function insertSideEffects(drugKey, sideEffects, drugClass) {
  const now = new Date().toISOString();
  db.prepare(`DELETE FROM drug_side_effects WHERE drug_key = ?`).run(drugKey);

  const insert = db.prepare(`
    INSERT INTO drug_side_effects
      (drug_key, symptom, frequency, frequency_pct, onset, description, source, cached_at)
    VALUES
      (@drug_key, @symptom, @frequency, @frequency_pct, @onset, @description, 'openfda', @cached_at)
  `);

  db.transaction((rows) => {
    for (const se of rows) {
      insert.run({
        drug_key:      drugKey,
        symptom:       se.symptom,
        frequency:     se.frequency,
        frequency_pct: se.pct ?? null,
        onset:         se.onset ?? null,
        description:   se.description,
        cached_at:     now,
      });
    }
  })(sideEffects);
}

function readFromDB(drugKey) {
  const rows = db.prepare(`
    SELECT dse.drug_key, dse.symptom, dse.frequency, dse.frequency_pct,
           dse.onset, dse.description, dse.cached_at, d.drug_class
    FROM drug_side_effects dse
    LEFT JOIN drugs d ON d.internal_key = dse.drug_key
    WHERE dse.is_active = 1 AND dse.drug_key = ?
    ORDER BY dse.frequency
  `).all(drugKey);

  if (rows.length === 0) return null;

  return {
    class: rows[0].drug_class ?? drugKey,
    side_effects: rows.map(r => ({
      symptom:     r.symptom,
      frequency:   r.frequency,
      pct:         r.frequency_pct,
      onset:       r.onset,
      description: r.description,
    })),
    _cachedAt: rows[0].cached_at,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Returns side effect data for a single drug key.
 * Cache-first (90-day TTL). On miss: regex-extract → Groq descriptions.
 * Falls back to full Groq parse if regex yields < 3 results.
 */
export async function getSideEffects(drugKey) {
  const cached = readFromDB(drugKey);
  if (cached && !isStale(cached._cachedAt)) return cached;

  let label;
  try {
    label = await fetchOpenFDALabel(drugKey);
  } catch (err) {
    console.warn(`[sideEffectsFetcher] OpenFDA fetch failed for "${drugKey}":`, err.message);
    return cached ?? null;
  }

  if (!label?.adverseReactions) {
    console.warn(`[sideEffectsFetcher] No FDA label found for "${drugKey}"`);
    return cached ?? null;
  }

  let sideEffects;
  try {
    // Phase 1: regex extraction
    const extracted = extractStructuredEffects(label.adverseReactions);
    console.log(`[sideEffectsFetcher] "${drugKey}": regex extracted ${extracted.length} effects`);

    if (extracted.length >= 3) {
      // Phase 2: Groq descriptions only (grounded — no frequency inference)
      sideEffects = await generateDescriptions(drugKey, extracted);
    } else {
      // Fallback: full Groq parse (label uses unusual prose format)
      console.log(`[sideEffectsFetcher] "${drugKey}": regex yield low, falling back to full Groq parse`);
      sideEffects = await fullGroqParse(drugKey, label.adverseReactions);
    }
  } catch (err) {
    console.warn(`[sideEffectsFetcher] Parse failed for "${drugKey}":`, err.message);
    return cached ?? null;
  }

  if (!sideEffects?.length) return cached ?? null;

  try {
    ensureDrugRow(drugKey, label.drugClass);
    insertSideEffects(drugKey, sideEffects, label.drugClass);
  } catch (err) {
    console.warn(`[sideEffectsFetcher] DB insert failed for "${drugKey}":`, err.message);
  }

  return readFromDB(drugKey);
}

/**
 * Resolves multiple drug keys in parallel (max 5 concurrent).
 * Returns { [drugKey]: sideEffectData | null }
 */
export async function getSideEffectsMap(drugKeys) {
  const unique = [...new Set(drugKeys)];
  const result = {};
  const toFetch = [];

  for (const key of unique) {
    const cached = readFromDB(key);
    if (cached && !isStale(cached._cachedAt)) {
      result[key] = cached;
    } else {
      result[key] = cached ?? null;
      toFetch.push(key);
    }
  }

  const CONCURRENCY = 5;
  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const batch = toFetch.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (key) => {
        const data = await getSideEffects(key);
        if (data) result[key] = data;
      })
    );
  }

  return result;
}
