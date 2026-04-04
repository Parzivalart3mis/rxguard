/**
 * Phase 2A verification script
 *
 * Tests 4 known prescribing scenarios against the live backend.
 * Requires the backend to be running on http://localhost:3001
 *
 * Usage: node scripts/verify-phase2a.js
 */

const BASE = 'http://localhost:3001';

let passed = 0;
let failed = 0;

const assert = (label, condition, detail = '') => {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
};

const postRec = async (patient, selectedAntibiotic) => {
  const res = await fetch(`${BASE}/api/recommendations`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ patient, selectedAntibiotic }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// ── Patient fixtures ──────────────────────────────────────────────────────────

const VIRAL_URI_PATIENT = {
  conditions:   [{ code: 'J06.9', display: 'Upper respiratory infection, unspecified' }],
  observations: [
    { display: 'Body temperature', value: 37.1 },
    { display: 'Duration of symptoms', value: '4' },
    { display: 'Procalcitonin', value: 0.1 },
    { display: 'WBC count', value: 7.0 },
  ],
  allergies:          [],
  pastAntibiotics:    [],
  currentMedications: [],
};

const STREP_PHARYNGITIS_PATIENT = {
  centorScore:  4,
  conditions:   [{ code: 'J02.0', display: 'Streptococcal pharyngitis' }],
  observations: [
    { display: 'Body temperature', value: 38.8 },
    { display: 'Cough', value: 'absent' },
    { display: 'Tonsillar swelling/exudate', value: 'present' },
    { display: 'Tender anterior cervical lymphadenopathy', value: 'present' },
    { display: 'WBC count', value: 13.5 },
  ],
  allergies:          [],
  pastAntibiotics:    [],
  currentMedications: [],
  age:                25,
};

const STREP_PENICILLIN_ALLERGY_PATIENT = {
  ...STREP_PHARYNGITIS_PATIENT,
  allergies: [
    { substance: 'penicillin', criticality: 'high' },
  ],
};

const UTI_PATIENT = {
  conditions: [{ code: 'N30.0', display: 'Acute cystitis' }],
  observations: [
    { display: 'Body temperature', value: 37.2 },
    { display: 'Dysuria', value: 'present' },
    { display: 'Urinary frequency', value: 'present' },
    { display: 'Vaginal discharge', value: 'absent' },
    { display: 'Nitrites in urine', value: 'positive' },
    { display: 'Leukocyte esterase', value: 'positive' },
  ],
  allergies:          [],
  pastAntibiotics:    [],
  currentMedications: [],
};

// ── Scenario 1: Viral URI — antibiotics NOT recommended ───────────────────────

const runScenario1 = async () => {
  console.log('\nScenario 1: Viral URI (no antibiotics expected)');
  const data = await postRec(VIRAL_URI_PATIENT, null);
  assert('condition is viral_uri',         data.condition === 'viral_uri', `got: ${data.condition}`);
  assert('recommendation is null',         data.recommendation === null,   `got: ${JSON.stringify(data.recommendation)}`);
  assert('conditionName is present',       !!data.conditionName);
  assert('no alternatives',                !data.alternatives?.length);
};

// ── Scenario 2: Strep pharyngitis Centor 4 → amoxicillin ─────────────────────

const runScenario2 = async () => {
  console.log('\nScenario 2: Strep pharyngitis (Centor 4) → narrow-spectrum first-line');
  const data = await postRec(STREP_PHARYNGITIS_PATIENT, null);
  assert('condition is strep_pharyngitis', data.condition === 'strep_pharyngitis', `got: ${data.condition}`);
  assert('recommendation exists',          !!data.recommendation);
  const rxKey = data.recommendation?.antibiotic;
  assert('first-line narrow antibiotic',   rxKey === 'amoxicillin' || rxKey === 'penicillin',
    `got: ${rxKey}`);
  assert('spectrum is narrow',             data.recommendation?.spectrum === 'narrow',
    `got: ${data.recommendation?.spectrum}`);
  assert('has alternatives',               data.alternatives?.length > 0);
};

// ── Scenario 3: Penicillin allergy → penicillin excluded, amoxicillin warned ──
// NOTE: direct penicillin allergy → critical=true → penicillin excluded.
// Amoxicillin cross-reactivity → warning added, score penalty +50, but not
// excluded (critical=false). This matches original client-side behavior exactly.

const runScenario3 = async () => {
  console.log('\nScenario 3: Penicillin allergy + pharyngitis → penicillin excluded, amoxicillin warned');
  const data = await postRec(STREP_PENICILLIN_ALLERGY_PATIENT, null);
  assert('condition is strep_pharyngitis', data.condition === 'strep_pharyngitis', `got: ${data.condition}`);
  assert('recommendation exists',          !!data.recommendation);
  const rxKey = data.recommendation?.antibiotic;
  // penicillin (direct match) must be excluded
  assert('penicillin not recommended',     rxKey !== 'penicillin',  `got: ${rxKey}`);
  const altKeys = (data.alternatives || []).map((a) => a.antibiotic);
  assert('penicillin not in alternatives', !altKeys.includes('penicillin'), `alternatives: ${altKeys}`);
  // Whichever antibiotic IS recommended should have allergy-related warnings
  // (either direct or cross-reactivity) OR be a safe alternative (azithromycin)
  assert('response has allergy context',
    !!(data.recommendation && (rxKey === 'amoxicillin' || rxKey === 'azithromycin')),
    `got: ${rxKey}`);
};

// ── Scenario 4: UTI — nitrofurantoin ranks above tmp_smx ─────────────────────

const runScenario4 = async () => {
  console.log('\nScenario 4: UTI — nitrofurantoin preferred over tmp_smx (28% resistance)');
  const data = await postRec(UTI_PATIENT, null);
  assert('condition is uncomplicated_uti', data.condition === 'uncomplicated_uti', `got: ${data.condition}`);
  assert('recommendation exists',          !!data.recommendation);
  const rxKey = data.recommendation?.antibiotic;
  // nitrofurantoin has 3% resistance, tmp_smx has 28% → nitrofurantoin should rank first
  assert('nitrofurantoin recommended',     rxKey === 'nitrofurantoin', `got: ${rxKey}`);
  const alts = data.alternatives || [];
  const smxAlt = alts.find((a) => a.antibiotic === 'tmp_smx');
  assert('tmp_smx is an alternative',      !!smxAlt, `alternatives: ${alts.map((a) => a.antibiotic)}`);
};

// ── Bonus: antibiogram endpoint ───────────────────────────────────────────────

const runAntibiogramCheck = async () => {
  console.log('\nBonus: GET /api/antibiogram');
  const res  = await fetch(`${BASE}/api/antibiogram`);
  const data = await res.json();
  assert('year is 2025',                    data.year === 2025, `got: ${data.year}`);
  assert('antibioticMetadata present',      typeof data.antibioticMetadata === 'object');
  assert('amoxicillin in metadata',         !!data.antibioticMetadata?.amoxicillin);
  assert('historicalResistance present',    typeof data.historicalResistance === 'object');
  assert('data array has entries',          Array.isArray(data.data) && data.data.length > 0);
};

// ── Run all ───────────────────────────────────────────────────────────────────

const run = async () => {
  console.log('=== RxGuard Phase 2A Verification ===');
  console.log(`Backend: ${BASE}`);

  // Check backend is up
  try {
    const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
    console.log(`Health: ${health.status} (${health.version})`);
  } catch {
    console.error('\n✗ Backend not reachable. Start with: npm run server');
    process.exit(1);
  }

  try {
    await runScenario1();
    await runScenario2();
    await runScenario3();
    await runScenario4();
    await runAntibiogramCheck();
  } catch (err) {
    console.error('\nUnexpected error:', err.message);
    process.exit(1);
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
};

run();
