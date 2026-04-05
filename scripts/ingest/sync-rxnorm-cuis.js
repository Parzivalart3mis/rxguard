/**
 * Phase 2B — Populate rxnorm_cui for all drugs in the database.
 *
 * Usage:  npm run sync:rxnorm
 *
 * Idempotent: only processes rows WHERE rxnorm_cui IS NULL.
 * Re-running after a partial run will pick up where it left off.
 *
 * Lookup priority:
 *   1. name_overrides.json — numeric string value → direct CUI (no API call)
 *   2. name_overrides.json — non-numeric string value → query-name override
 *   3. Normalized display_name (lowercase, stripped punctuation + dosage noise)
 */

import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { readFileSync } from 'fs';
import Database from 'better-sqlite3';

// ── path helpers ──────────────────────────────────────────────────────────────
const __dirname  = dirname(fileURLToPath(import.meta.url));
const DB_PATH    = join(__dirname, '../../rxguard.db');
const OVERRIDES  = JSON.parse(
  readFileSync(join(__dirname, 'name_overrides.json'), 'utf8')
);

// ── DB connection ─────────────────────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ── prepared statements ───────────────────────────────────────────────────────
const selectDrugs = db.prepare(
  `SELECT internal_key, display_name FROM drugs WHERE rxnorm_cui IS NULL`
);

const updateCui = db.prepare(
  `UPDATE drugs
   SET rxnorm_cui = ?, rxnorm_synced_at = datetime('now')
   WHERE internal_key = ?`
);

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Normalize a display_name for RxNorm lookup:
 *   1. Lowercase
 *   2. Strip dosage/unit noise  (e.g. "500mg", "25 mcg", "10 ml")
 *   3. Remove punctuation/symbols  (/, -, (, ), +, etc.)
 *   4. Collapse extra whitespace
 */
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\d+\s*(?:mg|mcg|μg|ug|ml|g|units?|meq)\b/gi, '') // dosage tokens
    .replace(/[/\-()+[\],.]/g, ' ')                              // punctuation → space
    .replace(/\s+/g, ' ')
    .trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchRxCui(query) {
  const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(query)}&search=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json?.idGroup?.rxnormId ?? [];
}

// ── main ──────────────────────────────────────────────────────────────────────

async function run() {
  const drugs = selectDrugs.all();

  if (drugs.length === 0) {
    console.log('All drugs already have rxnorm_cui populated. Nothing to do.');
    return;
  }

  console.log(`\nRxNorm CUI sync — ${drugs.length} drug(s) to process\n`);

  const results = { updated: 0, ambiguous: [], failed: [] };

  for (const drug of drugs) {
    const { internal_key, display_name } = drug;

    const override = OVERRIDES[internal_key];

    // Direct CUI override — skip API call entirely
    if (override && /^\d+$/.test(override)) {
      updateCui.run(override, internal_key);
      console.log(`  [${internal_key}]  direct override CUI ${override}  ✓`);
      results.updated++;
      continue;
    }

    // Determine query string (name override or normalized display_name)
    const query = override ?? normalizeName(display_name);
    process.stdout.write(`  [${internal_key}]  query: "${query}"  →  `);

    try {
      const cuis = await fetchRxCui(query);

      if (cuis.length === 1) {
        updateCui.run(cuis[0], internal_key);
        console.log(`CUI ${cuis[0]}  ✓`);
        results.updated++;
      } else if (cuis.length > 1) {
        console.log(`AMBIGUOUS (${cuis.join(', ')})  — skipped`);
        results.ambiguous.push({ internal_key, display_name, query, cuis });
      } else {
        console.log(`NOT FOUND  — skipped`);
        results.failed.push({ internal_key, display_name, query });
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}  — skipped`);
      results.failed.push({ internal_key, display_name, query, error: err.message });
    }

    await sleep(100);
  }

  // ── summary ───────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────');
  console.log('Summary');
  console.log('─────────────────────────────────────────');
  console.log(`  Total processed : ${drugs.length}`);
  console.log(`  Updated         : ${results.updated}`);
  console.log(`  Ambiguous       : ${results.ambiguous.length}`);
  console.log(`  Failed/Not found: ${results.failed.length}`);

  if (results.ambiguous.length > 0) {
    console.log('\nAmbiguous mappings (manual review needed):');
    for (const r of results.ambiguous) {
      console.log(`  ${r.internal_key} ("${r.display_name}") → [${r.cuis.join(', ')}]`);
      console.log(`    Add the correct CUI to name_overrides.json or run:`);
      console.log(`    UPDATE drugs SET rxnorm_cui='<CUI>' WHERE internal_key='${r.internal_key}';`);
    }
  }

  if (results.failed.length > 0) {
    console.log('\nFailed/not found (no CUI assigned):');
    for (const r of results.failed) {
      console.log(`  ${r.internal_key} ("${r.display_name}")${r.error ? '  error: ' + r.error : ''}`);
    }
  }

  console.log('─────────────────────────────────────────\n');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
