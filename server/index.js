/**
 * RxGuard Express backend — Phase 1
 *
 * Start:   node server/index.js
 * Or:      npm run server
 * With UI: npm run dev:full
 *
 * Environment variables (set in .env or shell):
 *   GROQ_API_KEY   — server-side Groq key (no VITE_ prefix)
 *   PORT           — optional, defaults to 3001
 */

// Load .env if present (gracefully ignored if file does not exist)
import { config } from 'dotenv';
config();

import express from 'express';
import cors    from 'cors';
import db from './db/client.js';
import { getSideEffects } from './services/sideEffectsFetcher.js';
import { syncDrugInteractions } from './services/interactionFetcher.js';

import safetyRouter          from './routes/safety.js';
import interactionsRouter    from './routes/interactions.js';
import renalRouter           from './routes/renalDosing.js';
import aiRouter              from './routes/ai.js';
import drugsRouter           from './routes/drugs.js';
import recommendationsRouter from './routes/recommendations.js';
import antibiogramRouter     from './routes/antibiogram.js';
import fhirRouter            from './routes/fhir.js';
import { errorHandler }      from './middleware/errorHandler.js';

const app  = express();
const PORT = process.env.PORT || 3001;

// ── middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',  // Vite default
    'http://localhost:4173',  // Vite preview
    'http://localhost:3000',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// ── routes ────────────────────────────────────────────────────────────────────
app.use('/api', safetyRouter);
app.use('/api', interactionsRouter);
app.use('/api', renalRouter);
app.use('/api', aiRouter);
app.use('/api', drugsRouter);
app.use('/api', recommendationsRouter);
app.use('/api', antibiogramRouter);
app.use('/api', fhirRouter);

// ── health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0-phase2a' });
});

// ── error handler (must be last) ──────────────────────────────────────────────
app.use(errorHandler);

// ── Startup migration: upgrade typical_pathogens to weighted format ───────────
// Converts ["E. coli"] → [{"pathogen":"E. coli","weight":0.85}] using the
// prevalence weights defined in src/data/guidelines.js (CDC/NHSN/IDSA sources).
// Safe to run on every startup — skips rows already in object format.
const WEIGHTED_PATHOGENS = {
  strep_pharyngitis:          JSON.stringify([{ pathogen: 'GAS (Group A Strep)', weight: 1.0 }]),
  uncomplicated_uti:          JSON.stringify([{ pathogen: 'E. coli', weight: 0.85 }]),
  complicated_uti:            JSON.stringify([{ pathogen: 'E. coli', weight: 0.65 }]),
  community_acquired_pneumonia: JSON.stringify([
    { pathogen: 'S. pneumoniae', weight: 0.50 },
    { pathogen: 'H. influenzae', weight: 0.30 },
    { pathogen: 'M. catarrhalis', weight: 0.20 },
  ]),
  acute_otitis_media:         JSON.stringify([
    { pathogen: 'S. pneumoniae', weight: 0.45 },
    { pathogen: 'H. influenzae', weight: 0.40 },
    { pathogen: 'M. catarrhalis', weight: 0.15 },
  ]),
  acute_sinusitis:            JSON.stringify([
    { pathogen: 'S. pneumoniae', weight: 0.40 },
    { pathogen: 'H. influenzae', weight: 0.35 },
    { pathogen: 'M. catarrhalis', weight: 0.25 },
  ]),
  cellulitis:                 JSON.stringify([
    { pathogen: 'S. aureus (MSSA)', weight: 0.65 },
    { pathogen: 'GAS (Group A Strep)', weight: 0.35 },
  ]),
  general_infection:          JSON.stringify([
    { pathogen: 'S. aureus (MSSA)', weight: 0.30 },
    { pathogen: 'S. pneumoniae',    weight: 0.30 },
    { pathogen: 'E. coli',          weight: 0.25 },
    { pathogen: 'H. influenzae',    weight: 0.15 },
  ]),
};

const migratePathogens = db.transaction(() => {
  let updated = 0;
  for (const [conditionKey, weightedJson] of Object.entries(WEIGHTED_PATHOGENS)) {
    const row = db.prepare('SELECT typical_pathogens FROM guidelines WHERE condition_key = ?').get(conditionKey);
    if (!row) continue;
    // Skip if already in object format (starts with '[{')
    if (row.typical_pathogens?.trimStart().startsWith('[{')) continue;
    db.prepare('UPDATE guidelines SET typical_pathogens = ? WHERE condition_key = ?')
      .run(weightedJson, conditionKey);
    updated++;
  }
  if (updated > 0) console.log(`[migration] Updated typical_pathogens to weighted format for ${updated} conditions.`);
});
migratePathogens();

// ── Startup migration: create demo_written_resources if missing ───────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS demo_written_resources (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    fhir_resource_type TEXT    NOT NULL DEFAULT 'MedicationRequest',
    fhir_resource_id   TEXT    NOT NULL,
    fhir_base_url      TEXT    NOT NULL,
    patient_id         TEXT,
    antibiotic_key     TEXT,
    created_at         TEXT    DEFAULT (datetime('now'))
  )
`).run();

app.listen(PORT, () => {
  console.log(`RxGuard backend listening on http://localhost:${PORT}`);
  console.log(`  GROQ_API_KEY:   ${process.env.GROQ_API_KEY ? 'set ✓' : 'not set (AI fallbacks will be used)'}`);
  console.log(`  FHIR_BASE_URL:  ${process.env.FHIR_BASE_URL || 'https://hapi.fhir.org/baseR4 (default)'}`);
  console.log(`  FHIR_AUTH_TOKEN: ${process.env.FHIR_AUTH_TOKEN ? 'set ✓' : 'not set (unauthenticated)'}`);

  // Background warmup: sync RxNav drug interactions (no API key needed)
  setImmediate(async () => {
    try {
      await syncDrugInteractions();
    } catch (err) {
      console.warn('[warmup] Interaction sync failed:', err.message);
    }
  });

  // Background warmup: fetch OpenFDA side effects for any drug that has none cached
  if (process.env.GROQ_API_KEY) {
    setImmediate(async () => {
      const missing = db.prepare(`
        SELECT d.internal_key FROM drugs d
        WHERE NOT EXISTS (
          SELECT 1 FROM drug_side_effects dse WHERE dse.drug_key = d.internal_key
        )
      `).all().map(r => r.internal_key);

      if (missing.length === 0) return;
      console.log(`[warmup] Fetching OpenFDA side effects for ${missing.length} drugs: ${missing.join(', ')}`);

      const delay = (ms) => new Promise(res => setTimeout(res, ms));
      for (const key of missing) {
        try {
          const result = await getSideEffects(key);
          console.log(`[warmup] ${key}: ${result ? `${result.side_effects.length} effects cached` : 'no data found'}`);
        } catch (err) {
          console.warn(`[warmup] ${key}: failed — ${err.message}`);
        }
        await delay(5000); // 5s between drugs keeps well within Groq's TPM limit
      }
      console.log('[warmup] Side effects warmup complete.');
    });
  }
});
