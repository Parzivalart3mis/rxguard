/**
 * RxGuard Phase 1 — seed verification script
 *
 * Checks:
 *   1. DB row counts match expected minimums
 *   2. Known drug keys exist in the drugs table
 *   3. /api/safety/check returns expected shape for two patient fixtures
 *   4. /api/interactions/check returns known interaction pair
 *   5. /api/renal/check flags metformin for low eGFR
 *
 * Usage:
 *   node scripts/verify-seed.js
 *
 * Requires the server to be running on port 3001 for API tests.
 * Run `npm run seed` first if the DB does not exist.
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, '../rxguard.db');
const BASE_URL  = 'http://localhost:3001';

let passed = 0;
let failed = 0;

const ok  = (label) => { console.log(`  ✓ ${label}`); passed++; };
const fail = (label, detail) => { console.error(`  ✗ ${label}${detail ? ': ' + detail : ''}`); failed++; };
const section = (title) => console.log(`\n${title}`);

// ── helpers ───────────────────────────────────────────────────────────────────

async function apiPost(path, body) {
  const r = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function apiGet(path) {
  const r = await fetch(`${BASE_URL}${path}`);
  return r.json();
}

// ── 1. DB file exists ─────────────────────────────────────────────────────────

section('1. Database file');
if (!existsSync(DB_PATH)) {
  fail('rxguard.db exists', 'file not found — run npm run seed first');
  console.error('\nCannot continue without database. Exiting.');
  process.exit(1);
}
ok('rxguard.db exists');

const db = new Database(DB_PATH, { readonly: true });

// ── 2. Row count assertions ───────────────────────────────────────────────────

section('2. Seeded row counts');

const counts = {
  drugs:              db.prepare('SELECT COUNT(*) as n FROM drugs').get().n,
  interactions:       db.prepare('SELECT COUNT(*) as n FROM drug_interactions WHERE is_active=1').get().n,
  renal_rules:        db.prepare('SELECT COUNT(*) as n FROM renal_dosing_rules WHERE is_active=1').get().n,
  side_effects:       db.prepare('SELECT COUNT(*) as n FROM drug_side_effects WHERE is_active=1').get().n,
  cascade_patterns:   db.prepare('SELECT COUNT(*) as n FROM cascade_patterns WHERE is_active=1').get().n,
};

console.log('  Counts:', counts);

counts.drugs            >= 20 ? ok(`drugs ≥ 20 (got ${counts.drugs})`)            : fail('drugs count', `expected ≥ 20, got ${counts.drugs}`);
counts.interactions     >= 15 ? ok(`interactions ≥ 15 (got ${counts.interactions})`) : fail('interactions count', `expected ≥ 15, got ${counts.interactions}`);
counts.renal_rules      >= 8  ? ok(`renal rules ≥ 8 (got ${counts.renal_rules})`) : fail('renal rules count', `expected ≥ 8, got ${counts.renal_rules}`);
counts.side_effects     >= 50 ? ok(`side effects ≥ 50 (got ${counts.side_effects})`) : fail('side effects count', `expected ≥ 50, got ${counts.side_effects}`);
counts.cascade_patterns >= 4  ? ok(`cascade patterns ≥ 4 (got ${counts.cascade_patterns})`) : fail('cascade count', `expected ≥ 4, got ${counts.cascade_patterns}`);

// ── 3. Known drug keys present ────────────────────────────────────────────────

section('3. Known drug keys');

const requiredKeys = [
  'amoxicillin', 'azithromycin', 'nitrofurantoin', 'ciprofloxacin',
  'metformin', 'lisinopril', 'furosemide', 'warfarin',
];

for (const key of requiredKeys) {
  const row = db.prepare('SELECT internal_key FROM drugs WHERE internal_key=?').get(key);
  row ? ok(key) : fail(key, 'not found in drugs table');
}

// ── 4. Known interaction pair present ────────────────────────────────────────

section('4. Interaction pair (warfarin ↔ azithromycin)');

const interaction = db.prepare(`
  SELECT * FROM drug_interactions
  WHERE (drug_a_key='warfarin' AND drug_b_key='azithromycin')
     OR (drug_a_key='azithromycin' AND drug_b_key='warfarin')
`).get();

interaction
  ? ok(`warfarin ↔ azithromycin found (severity: ${interaction.severity})`)
  : fail('warfarin ↔ azithromycin', 'not found in drug_interactions');

// ── 5. Renal rule for metformin ───────────────────────────────────────────────

section('5. Renal rule (metformin, eGFR threshold)');

const renalRule = db.prepare(`
  SELECT * FROM renal_dosing_rules WHERE drug_key='metformin' LIMIT 1
`).get();

renalRule
  ? ok(`metformin renal rule found (threshold eGFR ${renalRule.egfr_threshold}, severity: ${renalRule.severity})`)
  : fail('metformin renal rule', 'not found in renal_dosing_rules');

db.close();

// ── 6. API tests (require running server) ────────────────────────────────────

section('6. API — health check');

let serverAvailable = false;
try {
  const health = await apiGet('/api/health');
  if (health.status === 'ok') {
    ok(`/api/health → ${JSON.stringify(health)}`);
    serverAvailable = true;
  } else {
    fail('/api/health', `unexpected response: ${JSON.stringify(health)}`);
  }
} catch {
  fail('/api/health', 'server not reachable — start with npm run server to run API tests');
}

if (!serverAvailable) {
  console.log('\n  Skipping API tests (server not running).');
} else {

  section('7. POST /api/safety/check — Patient 1 (John Miller, viral URI)');
  const patient1 = {
    continuingMeds: [],
    newMeds: [{ drug: 'azithromycin', dose: '500mg', frequency: 'once daily', reason: 'Sore throat' }],
    labs: { egfr: 105, creatinine: 0.9, potassium: 4.1 },
    symptoms: [],
  };
  const safety1 = await apiPost('/api/safety/check', patient1);
  Array.isArray(safety1.allAlerts)
    ? ok(`allAlerts is array (${safety1.allAlerts.length} alerts)`)
    : fail('allAlerts shape', `got ${typeof safety1.allAlerts}`);
  typeof safety1.stats?.total === 'number'
    ? ok(`stats.total is number (${safety1.stats.total})`)
    : fail('stats.total', 'missing or not a number');
  typeof safety1.requiresAction === 'boolean'
    ? ok('requiresAction is boolean')
    : fail('requiresAction', 'missing or not boolean');

  section('8. POST /api/safety/check — Patient 3 (Robert Johnson, low eGFR with metformin)');
  const patient3 = {
    continuingMeds: [
      { drug: 'metformin',    dose: '1000mg', frequency: 'twice daily', reason: 'Diabetes' },
      { drug: 'lisinopril',   dose: '20mg',   frequency: 'daily',       reason: 'Hypertension' },
      { drug: 'atorvastatin', dose: '40mg',   frequency: 'daily',       reason: 'Cholesterol' },
    ],
    newMeds: [{ drug: 'azithromycin', dose: '500mg', frequency: 'once daily', reason: 'Pneumonia' }],
    labs: { egfr: 28, creatinine: 2.4, potassium: 5.1 },
    symptoms: [{ symptom: 'nausea', onset: '2025-04-01', severity: 'mild', description: 'Mild nausea' }],
  };
  const safety3 = await apiPost('/api/safety/check', patient3);
  const renalAlerts = safety3.allAlerts?.filter((a) => a.type === 'renal') || [];
  renalAlerts.length > 0
    ? ok(`renal alert present (${renalAlerts.map(a => a.title).join(', ')})`)
    : fail('renal alert for metformin + eGFR 28', 'expected at least one renal alert');
  safety3.requiresAction === true
    ? ok('requiresAction is true (critical/major alerts present)')
    : fail('requiresAction', `expected true, got ${safety3.requiresAction}`);

  section('9. POST /api/interactions/check — warfarin + azithromycin');
  const intResult = await apiPost('/api/interactions/check', {
    continuingMeds: [{ drug: 'warfarin', dose: '5mg', frequency: 'daily', reason: 'AFib' }],
    newMeds:        [{ drug: 'azithromycin', dose: '500mg', frequency: 'once daily', reason: 'Pneumonia' }],
  });
  intResult.interactions?.length > 0
    ? ok(`interaction detected: ${intResult.interactions[0].effect?.slice(0, 60)}…`)
    : fail('warfarin + azithromycin interaction', 'no interactions returned');

  section('10. POST /api/renal/check — metformin at eGFR 28');
  const renalResult = await apiPost('/api/renal/check', {
    continuingMeds: [{ drug: 'metformin', dose: '1000mg', frequency: 'twice daily', reason: 'Diabetes' }],
    newMeds: [],
    egfr: 28,
  });
  renalResult.renalAlerts?.length > 0
    ? ok(`renal alert: ${renalResult.renalAlerts[0].message?.slice(0, 60)}…`)
    : fail('metformin renal alert at eGFR 28', 'no alerts returned');

  section('11. GET /api/drugs/side-effects?keys=lisinopril,furosemide');
  const sideEffects = await apiGet('/api/drugs/side-effects?keys=lisinopril,furosemide');
  sideEffects.lisinopril?.side_effects?.length > 0
    ? ok(`lisinopril side effects: ${sideEffects.lisinopril.side_effects.length} entries`)
    : fail('lisinopril side effects', 'no entries returned');
}

// ── summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('Some checks failed — review output above before proceeding to Phase 2.');
  process.exit(1);
} else {
  console.log('All checks passed. Ready for Phase 2.');
}
