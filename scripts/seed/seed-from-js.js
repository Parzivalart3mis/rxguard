/**
 * Phase 1 seed script — mirrors existing hardcoded JS data files into SQLite.
 *
 * Usage:  npm run seed
 *
 * Safe to re-run. Uses INSERT OR IGNORE so existing rows are never overwritten.
 * The database is created fresh if it does not exist.
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { readFileSync, existsSync, unlinkSync } from 'fs';

// ── path helpers ──────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, '../../rxguard.db');
const SCHEMA    = readFileSync(join(__dirname, '../../server/db/schema.sql'), 'utf8');

// ── always start clean ────────────────────────────────────────────────────────
// Deleting the file ensures re-runs fully reflect changes to the source JS files.
if (existsSync(DB_PATH)) {
  unlinkSync(DB_PATH);
  console.log('✓ Removed existing database for clean seed');
}

// ── import existing data files ────────────────────────────────────────────────
import { drugInteractions }  from '../../src/data/drugInteractions.js';
import { renalDosingRules }  from '../../src/data/renalDosingRules.js';
import { drugSideEffects }   from '../../src/data/drugSideEffects.js';
import { cascadePatterns }   from '../../src/data/cascadePatterns.js';
import { antibioticMetadata, antibiogram } from '../../src/data/antibiogram.js';
import { guidelines } from '../../src/data/guidelines.js';

// ── open / init db ───────────────────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF');   // off during seeding; re-enabled after
db.exec(SCHEMA);

console.log('✓ Schema applied');

// ── helpers ───────────────────────────────────────────────────────────────────
const toDisplayName = (key) =>
  key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

// ── 1. collect all unique drug keys across all data files ─────────────────────
const allKeys = new Set();

// from antibioticMetadata
Object.keys(antibioticMetadata).forEach((k) => allKeys.add(k));

// from renalDosingRules (keyed by snake_case drug name)
Object.keys(renalDosingRules).forEach((k) => allKeys.add(k));

// from drugSideEffects
Object.keys(drugSideEffects).forEach((k) => allKeys.add(k));

// from drugInteractions
for (const row of drugInteractions) {
  allKeys.add(row.drug_a);
  allKeys.add(row.drug_b);
}

console.log(`  Found ${allKeys.size} unique drug keys`);

// ── 2. seed drugs table ───────────────────────────────────────────────────────
const insertDrug = db.prepare(`
  INSERT OR IGNORE INTO drugs
    (internal_key, display_name, drug_class, spectrum, spectrum_rank,
     typical_dose, renal_adjustment, cross_reactivity_classes, first_line_for, source)
  VALUES
    (@internal_key, @display_name, @drug_class, @spectrum, @spectrum_rank,
     @typical_dose, @renal_adjustment, @cross_reactivity_classes, @first_line_for, 'seed')
`);

// class lookup from drugSideEffects (has class info for non-antibiotics)
const classFromSideEffects = {};
for (const [key, val] of Object.entries(drugSideEffects)) {
  if (val.class) classFromSideEffects[key] = val.class;
}

let drugCount = 0;
for (const key of allKeys) {
  const meta = antibioticMetadata[key];

  if (meta) {
    // Antibiotic with full metadata
    insertDrug.run({
      internal_key: key,
      display_name: meta.name,
      drug_class: meta.spectrum === 'narrow' || meta.spectrum === 'medium' || meta.spectrum === 'broad' || meta.spectrum === 'very_broad'
        ? 'Antibiotic'
        : null,
      spectrum: meta.spectrum,
      spectrum_rank: meta.spectrumRank,
      typical_dose: meta.typicalDose,
      renal_adjustment: meta.renalAdjustment ? 1 : 0,
      cross_reactivity_classes: JSON.stringify(meta.crossReactivity || []),
      first_line_for: JSON.stringify(meta.firstLineFor || []),
    });
  } else {
    // Non-antibiotic drug — derive from available data
    insertDrug.run({
      internal_key: key,
      display_name: toDisplayName(key),
      drug_class: classFromSideEffects[key] || null,
      spectrum: null,
      spectrum_rank: null,
      typical_dose: null,
      renal_adjustment: renalDosingRules[key] ? 1 : 0,
      cross_reactivity_classes: JSON.stringify([]),
      first_line_for: JSON.stringify([]),
    });
  }
  drugCount++;
}
console.log(`✓ Seeded ${drugCount} drugs`);

// ── 3. seed drug_interactions ─────────────────────────────────────────────────
const insertInteraction = db.prepare(`
  INSERT OR IGNORE INTO drug_interactions
    (drug_a_key, drug_b_key, severity, effect, mechanism, action, source, confidence)
  VALUES
    (@drug_a_key, @drug_b_key, @severity, @effect, @mechanism, @action, 'seed', 'high')
`);

let interactionCount = 0;
for (const row of drugInteractions) {
  try {
    insertInteraction.run({
      drug_a_key: row.drug_a,
      drug_b_key: row.drug_b,
      severity:   row.severity,
      effect:     row.effect,
      mechanism:  row.mechanism || null,
      action:     row.action,
    });
    interactionCount++;
  } catch (e) {
    console.warn(`  Skipped interaction ${row.drug_a}↔${row.drug_b}: ${e.message}`);
  }
}
console.log(`✓ Seeded ${interactionCount} drug interactions`);

// ── 4. seed renal_dosing_rules ────────────────────────────────────────────────
const insertRenal = db.prepare(`
  INSERT OR IGNORE INTO renal_dosing_rules
    (drug_key, egfr_threshold, action, message, severity, source)
  VALUES
    (@drug_key, @egfr_threshold, @action, @message, @severity, 'seed')
`);

let renalCount = 0;
for (const [drugKey, ruleSet] of Object.entries(renalDosingRules)) {
  for (const req of ruleSet.requirements) {
    try {
      insertRenal.run({
        drug_key:       drugKey,
        egfr_threshold: req.egfr_threshold,
        action:         req.action,
        message:        req.message,
        severity:       req.severity,
      });
      renalCount++;
    } catch (e) {
      console.warn(`  Skipped renal rule ${drugKey} @${req.egfr_threshold}: ${e.message}`);
    }
  }
}
console.log(`✓ Seeded ${renalCount} renal dosing rules`);

// ── 5. seed drug_side_effects ─────────────────────────────────────────────────
const insertSideEffect = db.prepare(`
  INSERT OR IGNORE INTO drug_side_effects
    (drug_key, symptom, frequency, frequency_pct, onset, description, source)
  VALUES
    (@drug_key, @symptom, @frequency, @frequency_pct, @onset, @description, 'seed')
`);

let sideEffectCount = 0;
for (const [drugKey, profile] of Object.entries(drugSideEffects)) {
  for (const se of profile.side_effects) {
    try {
      insertSideEffect.run({
        drug_key:      drugKey,
        symptom:       se.symptom,
        frequency:     se.frequency,
        frequency_pct: se.pct ?? null,
        onset:         se.onset ?? null,
        description:   se.description ?? null,
      });
      sideEffectCount++;
    } catch (e) {
      console.warn(`  Skipped side effect ${drugKey}/${se.symptom}: ${e.message}`);
    }
  }
}
console.log(`✓ Seeded ${sideEffectCount} drug side effects`);

// ── 6. seed cascade_patterns ──────────────────────────────────────────────────
const insertCascade = db.prepare(`
  INSERT OR IGNORE INTO cascade_patterns
    (pattern_id, name, description, chain, resolution, pill_reduction, savings_potential, risk_level, source)
  VALUES
    (@pattern_id, @name, @description, @chain, @resolution, @pill_reduction, @savings_potential, @risk_level, 'seed')
`);

let cascadeCount = 0;
for (const pattern of cascadePatterns) {
  try {
    insertCascade.run({
      pattern_id:        pattern.id,
      name:              pattern.name,
      description:       pattern.description,
      chain:             JSON.stringify(pattern.chain),
      resolution:        pattern.resolution,
      pill_reduction:    pattern.pill_reduction ?? null,
      savings_potential: pattern.savings_potential ?? 0,
      risk_level:        pattern.risk_level,
    });
    cascadeCount++;
  } catch (e) {
    console.warn(`  Skipped cascade ${pattern.id}: ${e.message}`);
  }
}
console.log(`✓ Seeded ${cascadeCount} cascade patterns`);

// ── 7. seed guidelines ────────────────────────────────────────────────────────
const insertGuideline = db.prepare(`
  INSERT OR IGNORE INTO guidelines
    (condition_key, condition_name, first_line_drugs, alternative_drugs,
     typical_pathogens, duration, notes, source)
  VALUES
    (@condition_key, @condition_name, @first_line_drugs, @alternative_drugs,
     @typical_pathogens, @duration, @notes, 'seed')
`);

let guidelineCount = 0;
for (const [conditionKey, cond] of Object.entries(guidelines.conditions)) {
  try {
    insertGuideline.run({
      condition_key:    conditionKey,
      condition_name:   cond.name,
      first_line_drugs: JSON.stringify(cond.firstLine || []),
      alternative_drugs: JSON.stringify(cond.alternatives || []),
      typical_pathogens: JSON.stringify(cond.typicalPathogens || []),
      duration:         cond.duration ?? null,
      notes:            cond.notes ?? null,
    });
    guidelineCount++;
  } catch (e) {
    console.warn(`  Skipped guideline ${conditionKey}: ${e.message}`);
  }
}
console.log(`✓ Seeded ${guidelineCount} guidelines`);

// ── 8. seed antibiogram_data ──────────────────────────────────────────────────
const insertAntibiogramRow = db.prepare(`
  INSERT OR IGNORE INTO antibiogram_data
    (facility_name, year, pathogen, drug_key, susceptibility, resistance, trend)
  VALUES
    (@facility_name, @year, @pathogen, @drug_key, @susceptibility, @resistance, @trend)
`);

let antibiogramCount = 0;
const facility = antibiogram.facility;
const year     = antibiogram.year;

for (const pathogenEntry of antibiogram.data) {
  for (const [drugKey, data] of Object.entries(pathogenEntry.antibiotics)) {
    try {
      insertAntibiogramRow.run({
        facility_name: facility,
        year,
        pathogen:      pathogenEntry.pathogen,
        drug_key:      drugKey,
        susceptibility: data.susceptibility,
        resistance:     data.resistance,
        trend:          data.trend ?? null,
      });
      antibiogramCount++;
    } catch (e) {
      console.warn(`  Skipped antibiogram row ${drugKey}@${pathogenEntry.pathogen}: ${e.message}`);
    }
  }
}
console.log(`✓ Seeded ${antibiogramCount} antibiogram_data rows`);

// ── 9. seed antibiogram_history ───────────────────────────────────────────────
// Keys like "ciprofloxacin_ecoli" → drug_key + pathogen abbreviation
const PATHOGEN_SUFFIX_MAP = {
  ecoli:       'E. coli',
  spneumo:     'S. pneumoniae',
  gas:         'GAS (Group A Strep)',
  saureus:     'S. aureus (MSSA)',
  hinfluenzae: 'H. influenzae',
  mcatarrhalis:'M. catarrhalis',
};

// Build sorted drug key list (longest first to avoid prefix collisions like
// "amoxicillin" vs "amoxicillin_clav")
const knownDrugKeys = Object.keys(antibioticMetadata).sort((a, b) => b.length - a.length);

const insertHistory = db.prepare(`
  INSERT OR IGNORE INTO antibiogram_history
    (facility_name, drug_key, pathogen, year, resistance)
  VALUES
    (@facility_name, @drug_key, @pathogen, @year, @resistance)
`);

let historyCount = 0;
for (const [compositeKey, rows] of Object.entries(antibiogram.historicalResistance)) {
  // Find which known drug key is a prefix of compositeKey
  const matchedDrug = knownDrugKeys.find(k => compositeKey.startsWith(k + '_'));
  if (!matchedDrug) {
    console.warn(`  Skipped history key "${compositeKey}": no matching drug`);
    continue;
  }
  const suffix  = compositeKey.slice(matchedDrug.length + 1); // after "drugkey_"
  const pathogen = PATHOGEN_SUFFIX_MAP[suffix];
  if (!pathogen) {
    console.warn(`  Skipped history key "${compositeKey}": unknown pathogen suffix "${suffix}"`);
    continue;
  }

  for (const row of rows) {
    try {
      insertHistory.run({
        facility_name: facility,
        drug_key:      matchedDrug,
        pathogen,
        year:          row.year,
        resistance:    row.resistance,
      });
      historyCount++;
    } catch (e) {
      console.warn(`  Skipped history ${matchedDrug}/${pathogen}/${row.year}: ${e.message}`);
    }
  }
}
console.log(`✓ Seeded ${historyCount} antibiogram_history rows`);

// ── done ──────────────────────────────────────────────────────────────────────
db.pragma('foreign_keys = ON');
db.close();

console.log(`\nDatabase ready at: ${DB_PATH}`);
console.log('Run "npm run dev:full" to start frontend + backend.');
