-- RxGuard Phase 1 Schema
-- SQLite (compatible with PostgreSQL via pg driver swap)

CREATE TABLE IF NOT EXISTS drugs (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  internal_key             TEXT    NOT NULL UNIQUE,
  rxnorm_cui               TEXT,
  display_name             TEXT    NOT NULL,
  drug_class               TEXT,
  spectrum                 TEXT,
  spectrum_rank            INTEGER,
  typical_dose             TEXT,
  renal_adjustment         INTEGER DEFAULT 0,  -- 0/1 boolean
  cross_reactivity_classes TEXT,               -- JSON array as text
  first_line_for           TEXT,               -- JSON array as text
  source                   TEXT    NOT NULL DEFAULT 'seed',
  rxnorm_synced_at         TEXT,
  dailymed_set_id          TEXT,
  created_at               TEXT    DEFAULT (datetime('now')),
  updated_at               TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS drug_interactions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  drug_a_key       TEXT    NOT NULL REFERENCES drugs(internal_key),
  drug_b_key       TEXT    NOT NULL REFERENCES drugs(internal_key),
  severity         TEXT    NOT NULL CHECK(severity IN ('major','moderate','minor')),
  effect           TEXT    NOT NULL,
  mechanism        TEXT,
  action           TEXT    NOT NULL,
  source           TEXT    NOT NULL DEFAULT 'seed',
  dailymed_section TEXT,
  source_url       TEXT,
  confidence       TEXT    DEFAULT 'high' CHECK(confidence IN ('high','medium','low')),
  is_active        INTEGER DEFAULT 1,
  created_at       TEXT    DEFAULT (datetime('now')),
  updated_at       TEXT    DEFAULT (datetime('now')),
  UNIQUE(drug_a_key, drug_b_key)
);

CREATE INDEX IF NOT EXISTS idx_interactions_a ON drug_interactions(drug_a_key);
CREATE INDEX IF NOT EXISTS idx_interactions_b ON drug_interactions(drug_b_key);

CREATE TABLE IF NOT EXISTS renal_dosing_rules (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  drug_key        TEXT    NOT NULL REFERENCES drugs(internal_key),
  egfr_threshold  INTEGER NOT NULL,
  action          TEXT    NOT NULL,
  message         TEXT    NOT NULL,
  severity        TEXT    NOT NULL CHECK(severity IN ('major','moderate','minor')),
  source          TEXT    NOT NULL DEFAULT 'seed',
  is_active       INTEGER DEFAULT 1,
  created_at      TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_renal_drug ON renal_dosing_rules(drug_key);

CREATE TABLE IF NOT EXISTS drug_side_effects (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  drug_key        TEXT    NOT NULL REFERENCES drugs(internal_key),
  symptom         TEXT    NOT NULL,
  frequency       TEXT    NOT NULL CHECK(frequency IN ('very_common','common','uncommon','rare','unknown')),
  frequency_pct   REAL,
  onset           TEXT,
  description     TEXT,
  source          TEXT    NOT NULL DEFAULT 'seed',
  is_active       INTEGER DEFAULT 1,
  created_at      TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_side_effects_drug ON drug_side_effects(drug_key);
CREATE INDEX IF NOT EXISTS idx_side_effects_symptom ON drug_side_effects(symptom);

CREATE TABLE IF NOT EXISTS cascade_patterns (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_id        TEXT    NOT NULL UNIQUE,
  name              TEXT    NOT NULL,
  description       TEXT    NOT NULL,
  chain             TEXT    NOT NULL,  -- JSON array
  resolution        TEXT    NOT NULL,
  pill_reduction    TEXT,
  savings_potential INTEGER DEFAULT 0,
  risk_level        TEXT    CHECK(risk_level IN ('low','moderate','high','critical')),
  source            TEXT    NOT NULL DEFAULT 'seed',
  is_active         INTEGER DEFAULT 1,
  created_at        TEXT    DEFAULT (datetime('now'))
);

-- ── Phase 2A tables ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS guidelines (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  condition_key    TEXT    NOT NULL UNIQUE,
  condition_name   TEXT    NOT NULL,
  first_line_drugs TEXT    NOT NULL,  -- JSON array of internal_key strings
  alternative_drugs TEXT,             -- JSON array
  typical_pathogens TEXT,             -- JSON array of pathogen display names
  duration         TEXT,
  notes            TEXT,
  source           TEXT    NOT NULL DEFAULT 'seed',
  is_active        INTEGER DEFAULT 1,
  created_at       TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS antibiogram_data (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  facility_name   TEXT    NOT NULL DEFAULT 'Metro General Hospital',
  year            INTEGER NOT NULL,
  pathogen        TEXT    NOT NULL,
  drug_key        TEXT    NOT NULL REFERENCES drugs(internal_key),
  susceptibility  INTEGER NOT NULL,
  resistance      INTEGER NOT NULL,
  trend           TEXT    CHECK(trend IN ('stable','declining','increasing')),
  is_active       INTEGER DEFAULT 1,
  created_at      TEXT    DEFAULT (datetime('now')),
  UNIQUE(facility_name, year, pathogen, drug_key)
);

CREATE INDEX IF NOT EXISTS idx_antibiogram_drug ON antibiogram_data(drug_key);
CREATE INDEX IF NOT EXISTS idx_antibiogram_pathogen ON antibiogram_data(pathogen);

CREATE TABLE IF NOT EXISTS antibiogram_history (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  facility_name   TEXT    NOT NULL DEFAULT 'Metro General Hospital',
  drug_key        TEXT    NOT NULL REFERENCES drugs(internal_key),
  pathogen        TEXT    NOT NULL,
  year            INTEGER NOT NULL,
  resistance      INTEGER NOT NULL,
  UNIQUE(facility_name, drug_key, pathogen, year)
);

CREATE INDEX IF NOT EXISTS idx_hist_drug ON antibiogram_history(drug_key);

-- ── Ingestion audit log ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ingestion_log (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  job_name         TEXT    NOT NULL,
  status           TEXT    NOT NULL CHECK(status IN ('running','completed','failed','partial')),
  records_fetched  INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated  INTEGER DEFAULT 0,
  records_skipped  INTEGER DEFAULT 0,
  error_message    TEXT,
  started_at       TEXT    NOT NULL,
  completed_at     TEXT,
  metadata         TEXT
);
