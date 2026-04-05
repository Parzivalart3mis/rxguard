/**
 * sideEffectsFetcher.js
 *
 * On a cache miss (or stale entry > TTL_DAYS old), fetches the FDA drug label
 * from OpenFDA, uses Groq to parse the adverse-reactions text into structured
 * side-effect rows, then caches them in drug_side_effects.
 *
 * TTL: 30 days — FDA labels rarely change but this keeps data fresh over time.
 */

import db from '../db/client.js';

const OPENFDA_URL = 'https://api.fda.gov/drug/label.json';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TTL_DAYS = 30;

// Maps internal drug keys to the primary substance name used in OpenFDA.
// For compound drugs, the first active ingredient is used.
// null = skip OpenFDA (too generic or no single label exists).
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

const keyToSubstanceName = (key) => {
  if (key in OPENFDA_SUBSTANCE) return OPENFDA_SUBSTANCE[key]; // may be null
  return key.replace(/_/g, ' ');
};

const keyToDisplayName = (key) =>
  key.replace(/_/g, ' ');

// ── OpenFDA ────────────────────────────────────────────────────────────────────

async function fetchOpenFDALabel(drugKey) {
  const substance = keyToSubstanceName(drugKey);
  if (!substance) return null; // key explicitly has no OpenFDA mapping

  // Try multiple search strategies in order until one returns a result
  const strategies = [
    `openfda.substance_name:"${substance.toUpperCase()}"`,
    `openfda.generic_name:"${substance}"`,
    `openfda.substance_name:"${substance.split(' ')[0].toUpperCase()}"`, // base name only
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
        warnings: result.warnings?.[0] ?? null,
        drugClass: result.openfda?.pharm_class_cs?.[0] ?? result.openfda?.pharm_class_epc?.[0] ?? null,
      };
    } catch {
      continue;
    }
  }

  return null;
}

// ── Groq parse ─────────────────────────────────────────────────────────────────

async function parseWithGroq(drugKey, labelText) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const prompt = `You are a clinical pharmacist. Extract structured side effect data from this FDA drug label text for "${keyToSubstanceName(drugKey) ?? keyToDisplayName(drugKey)}".

Return ONLY a JSON array (no markdown, no explanation) of up to 10 side effects in this exact shape:
[
  {
    "symptom": "short name in lowercase",
    "frequency": "very_common" | "common" | "uncommon" | "rare",
    "pct": number or null,
    "onset": "e.g. hours, days, weeks" or null,
    "description": "patient-friendly 1-sentence explanation"
  }
]

Rules:
- frequency must be one of: very_common (>10%), common (1-10%), uncommon (0.1-1%), rare (<0.1%)
- If frequency is not stated, infer from context clues or use "uncommon"
- pct: use numeric value if stated, otherwise null
- description: write for a patient, not a clinician
- Include the most clinically significant effects first (serious ones last if rare)
- Skip minor lab abnormalities that have no patient-facing impact

FDA label text:
${labelText.slice(0, 3000)}`;

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0.1,
    }),
  });

  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '';

  // Strip any accidental markdown fences
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);

  const VALID_FREQUENCIES = new Set(['very_common', 'common', 'uncommon', 'rare']);
  return parsed.filter(
    (se) =>
      typeof se.symptom === 'string' &&
      VALID_FREQUENCIES.has(se.frequency) &&
      typeof se.description === 'string'
  );
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

  // Replace all existing rows for this drug with the fresh OpenFDA data
  db.prepare(`DELETE FROM drug_side_effects WHERE drug_key = ?`).run(drugKey);

  const insert = db.prepare(`
    INSERT INTO drug_side_effects
      (drug_key, symptom, frequency, frequency_pct, onset, description, source, cached_at)
    VALUES
      (@drug_key, @symptom, @frequency, @frequency_pct, @onset, @description, 'openfda', @cached_at)
  `);

  const insertMany = db.transaction((rows) => {
    for (const se of rows) {
      insert.run({
        drug_key: drugKey,
        symptom: se.symptom,
        frequency: se.frequency,
        frequency_pct: se.pct ?? null,
        onset: se.onset ?? null,
        description: se.description,
        cached_at: now,
      });
    }
  });

  insertMany(sideEffects);
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
    side_effects: rows.map((r) => ({
      symptom: r.symptom,
      frequency: r.frequency,
      pct: r.frequency_pct,
      onset: r.onset,
      description: r.description,
    })),
    _cachedAt: rows[0].cached_at,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Returns side effect data for a single drug key.
 * Checks cache first; fetches from OpenFDA + Groq if missing or stale.
 * Returns null if the drug cannot be found in OpenFDA.
 */
export async function getSideEffects(drugKey) {
  // 1. Check cache
  const cached = readFromDB(drugKey);
  if (cached && !isStale(cached._cachedAt)) {
    return cached;
  }

  // 2. Fetch from OpenFDA
  let label;
  try {
    label = await fetchOpenFDALabel(drugKey);
  } catch (err) {
    console.warn(`[sideEffectsFetcher] OpenFDA fetch failed for "${drugKey}":`, err.message);
    return cached ?? null; // return stale data if available
  }

  if (!label?.adverseReactions) {
    console.warn(`[sideEffectsFetcher] No FDA label found for "${drugKey}"`);
    return cached ?? null;
  }

  // 3. Parse with Groq
  let sideEffects;
  try {
    sideEffects = await parseWithGroq(drugKey, label.adverseReactions);
  } catch (err) {
    console.warn(`[sideEffectsFetcher] Groq parse failed for "${drugKey}":`, err.message);
    return cached ?? null;
  }

  if (!sideEffects?.length) {
    return cached ?? null;
  }

  // 4. Cache in DB
  try {
    ensureDrugRow(drugKey, label.drugClass);
    insertSideEffects(drugKey, sideEffects, label.drugClass);
  } catch (err) {
    console.warn(`[sideEffectsFetcher] DB insert failed for "${drugKey}":`, err.message);
  }

  return readFromDB(drugKey);
}

/**
 * Resolves multiple drug keys in parallel (capped at 5 concurrent fetches).
 * Returns { [drugKey]: sideEffectData | null }
 */
export async function getSideEffectsMap(drugKeys) {
  const unique = [...new Set(drugKeys)];

  // Check which keys are already cached and fresh
  const result = {};
  const toFetch = [];

  for (const key of unique) {
    const cached = readFromDB(key);
    if (cached && !isStale(cached._cachedAt)) {
      result[key] = cached;
    } else {
      result[key] = cached ?? null; // stale or missing — will be refreshed
      toFetch.push(key);
    }
  }

  // Fetch missing/stale in parallel (max 5 concurrent to avoid rate limits)
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
