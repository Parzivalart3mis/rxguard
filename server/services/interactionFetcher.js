/**
 * interactionFetcher.js
 *
 * Fetches drug-drug interaction data from OpenFDA drug labels, then uses Groq
 * to extract structured pairs involving other drugs in the system.
 * Results are cached in drug_interactions with source='openfda'.
 *
 * Mirrors the pattern in sideEffectsFetcher.js (OpenFDA label → Groq parse → DB cache).
 * Seed rows (source='seed') are never overwritten — INSERT OR IGNORE.
 *
 * TTL: 30 days
 */

import db from '../db/client.js';

const OPENFDA_URL  = 'https://api.fda.gov/drug/label.json';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TTL_DAYS     = 30;

// Maps internal keys to the substance name used in OpenFDA queries.
// null = skip (no reliable single-ingredient FDA label).
const OPENFDA_SUBSTANCE = {
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
  lisinopril:         'lisinopril',
  amlodipine:         'amlodipine besylate',
  metoprolol:         'metoprolol tartrate',
  atorvastatin:       'atorvastatin',
  furosemide:         'furosemide',
  warfarin:           'warfarin sodium',
  metformin:          'metformin hydrochloride',
  omeprazole:         'omeprazole',
  sertraline:         'sertraline hydrochloride',
  ibuprofen:          'ibuprofen',
  potassium_chloride: 'potassium chloride',
  birth_control:      null,
};

const getLookupSubstance = (key) =>
  key in OPENFDA_SUBSTANCE ? OPENFDA_SUBSTANCE[key] : key.replace(/_/g, ' ');

// ── OpenFDA label fetch ────────────────────────────────────────────────────────

async function fetchInteractionText(drugKey) {
  const substance = getLookupSubstance(drugKey);
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

      const text = result.drug_interactions?.[0] ?? null;
      if (text) return text;
    } catch {
      continue;
    }
  }
  return null;
}

// ── Groq parse ─────────────────────────────────────────────────────────────────

async function parseInteractionsWithGroq(drugKey, interactionText, knownDrugs) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const drugName = (OPENFDA_SUBSTANCE[drugKey] ?? drugKey.replace(/_/g, ' '));

  // Build the drug list for the prompt: "warfarin (key: warfarin), ..."
  const drugListStr = knownDrugs
    .filter(d => d.key !== drugKey)
    .map(d => `${d.name} (key: ${d.key})`)
    .join(', ');

  const prompt = `You are a clinical pharmacist. From this FDA drug label drug_interactions section for "${drugName}", identify interactions with drugs from this specific list only:

${drugListStr}

Return ONLY a JSON array (no markdown, no explanation) in this shape:
[
  {
    "other_drug_key": "exact key from the list above",
    "severity": "major" | "moderate" | "minor",
    "effect": "1-2 sentence description of the interaction effect",
    "action": "recommended clinical action for prescribers"
  }
]

Rules:
- ONLY include drugs from the provided list — ignore all others
- major = contraindicated, avoid concurrent use, or life-threatening risk
- moderate = use with caution, monitor closely, or dose adjustment required
- minor = minimal clinical significance, informational only
- If no interactions with the listed drugs are mentioned, return []

FDA drug_interactions text:
${interactionText.slice(0, 4000)}`;

  let res;
  for (let attempt = 1; attempt <= 3; attempt++) {
    res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
        temperature: 0.1,
      }),
    });
    if (res.status !== 429) break;
    const wait = attempt * 10000;
    console.warn(`[interactionFetcher] Groq 429 for "${drugKey}", retrying in ${wait / 1000}s…`);
    await new Promise(r => setTimeout(r, wait));
  }

  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data = await res.json();
  const raw  = data.choices?.[0]?.message?.content ?? '';

  let cleaned = raw.replace(/```json|```/g, '').trim();

  // If Groq hit max_tokens mid-stream the JSON array may be truncated.
  // Recover by trimming to the last complete object.
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Find last complete '}' and close the array
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace !== -1) {
      try {
        parsed = JSON.parse(cleaned.slice(0, lastBrace + 1) + ']');
      } catch {
        parsed = [];
      }
    } else {
      parsed = [];
    }
  }

  const validKeys = new Set(knownDrugs.map(d => d.key));
  const VALID_SEVERITIES = new Set(['major', 'moderate', 'minor']);

  return parsed.filter(
    (item) =>
      typeof item.other_drug_key === 'string' &&
      validKeys.has(item.other_drug_key) &&
      item.other_drug_key !== drugKey &&
      VALID_SEVERITIES.has(item.severity) &&
      typeof item.effect === 'string'
  );
}

// ── DB helpers ─────────────────────────────────────────────────────────────────

// Track which drugs have been synced so failed ones are retried on next startup
function getSyncedDrugs() {
  return new Set(
    db.prepare("SELECT DISTINCT drug_a_key as k FROM drug_interactions WHERE source='openfda' UNION SELECT DISTINCT drug_b_key FROM drug_interactions WHERE source='openfda'")
      .all().map(r => r.k)
  );
}

function isStale() {
  const row = db.prepare(
    "SELECT updated_at FROM drug_interactions WHERE source = 'openfda' ORDER BY updated_at DESC LIMIT 1"
  ).get();
  if (!row) return true;
  const age = (Date.now() - new Date(row.updated_at).getTime()) / (1000 * 60 * 60 * 24);
  return age > TTL_DAYS;
}

function upsertPairs(drugKey, pairs) {
  const now    = new Date().toISOString();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO drug_interactions
      (drug_a_key, drug_b_key, severity, effect, mechanism, action, source, created_at, updated_at)
    VALUES
      (@drug_a_key, @drug_b_key, @severity, @effect, @mechanism, @action, 'openfda', @now, @now)
  `);

  const run = db.transaction((rows) => {
    let inserted = 0;
    for (const row of rows) {
      // Normalize pair order so UNIQUE(drug_a_key, drug_b_key) is stable
      const [a, b] = [drugKey, row.other_drug_key].sort();
      const result = insert.run({
        drug_a_key: a,
        drug_b_key: b,
        severity:   row.severity,
        effect:     row.effect,
        mechanism:  null,
        action:     row.action || defaultAction(row.severity),
        now,
      });
      inserted += result.changes;
    }
    return inserted;
  });

  return run(pairs);
}

function defaultAction(severity) {
  switch (severity) {
    case 'major':    return 'Avoid combination or seek specialist guidance before prescribing.';
    case 'moderate': return 'Use with caution. Monitor for adverse effects.';
    default:         return 'Be aware of potential interaction. Monitor as clinically indicated.';
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * For each drug in the system, fetches its FDA label drug_interactions section,
 * uses Groq to extract pairs involving other known drugs, and caches them in DB.
 *
 * Safe to call on every startup — exits early if data is fresh (< TTL_DAYS).
 * Seed rows are never overwritten (INSERT OR IGNORE).
 * Requires GROQ_API_KEY.
 */
export async function syncDrugInteractions() {
  if (!process.env.GROQ_API_KEY) {
    console.log('[interactionFetcher] GROQ_API_KEY not set — skipping interaction sync.');
    return;
  }

  // Build the drug list passed to Groq so it knows what to look for
  const knownDrugs = db.prepare('SELECT internal_key as key, display_name as name FROM drugs').all();
  const alreadySynced = getSyncedDrugs();

  let toSync;
  if (isStale()) {
    // Full re-sync after TTL expiry
    toSync = knownDrugs;
  } else {
    // Fresh data — only retry drugs that failed (never appeared in any openfda row)
    toSync = knownDrugs.filter(d => !alreadySynced.has(d.key));
  }

  if (toSync.length === 0) {
    console.log('[interactionFetcher] Interaction data is fresh and complete — skipping sync.');
    return;
  }

  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  let totalInserted = 0;

  console.log(`[interactionFetcher] Syncing interactions for ${toSync.length} drugs via OpenFDA + Groq…`);

  for (const drug of toSync) {
    try {
      // 1. Fetch interaction text from FDA label
      const text = await fetchInteractionText(drug.key);
      if (!text) {
        console.log(`[interactionFetcher] ${drug.key}: no FDA interaction text found`);
        await delay(500);
        continue;
      }

      // 2. Parse with Groq
      const pairs = await parseInteractionsWithGroq(drug.key, text, knownDrugs);

      // 3. Cache
      const inserted = upsertPairs(drug.key, pairs);
      totalInserted += inserted;
      console.log(`[interactionFetcher] ${drug.key}: ${pairs.length} interactions found, ${inserted} new rows`);
    } catch (err) {
      console.warn(`[interactionFetcher] ${drug.key}: failed — ${err.message}`);
    }

    // 5s between drugs to stay within Groq TPM limit
    await delay(5000);
  }

  console.log(`[interactionFetcher] Sync complete — ${totalInserted} new interaction pairs inserted.`);
}
