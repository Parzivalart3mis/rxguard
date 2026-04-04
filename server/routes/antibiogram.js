/**
 * GET /api/antibiogram?year=2025
 *
 * Returns antibiogram data in a shape that mirrors src/data/antibiogram.js
 * so React components can consume it with minimal changes.
 *
 * Response shape:
 * {
 *   facility: string,
 *   year: number,
 *   data: [{ pathogen, antibiotics: { [drugKey]: { susceptibility, resistance, trend } } }],
 *   antibioticMetadata: { [drugKey]: { name, spectrum, spectrumRank, typicalDose, crossReactivity, firstLineFor } },
 *   historicalResistance: { [compositeKey]: [{ year, resistance }] }
 * }
 */

import { Router } from 'express';
import db from '../db/client.js';

const router = Router();

const stmtMaxYear = db.prepare(
  'SELECT MAX(year) AS max_year FROM antibiogram_data WHERE is_active = 1'
);

const stmtAntibiogramRows = db.prepare(
  'SELECT * FROM antibiogram_data WHERE year = ? AND is_active = 1 ORDER BY pathogen, drug_key'
);

const stmtAntibiotics = db.prepare(
  "SELECT * FROM drugs WHERE spectrum IS NOT NULL ORDER BY spectrum_rank, internal_key"
);

const stmtHistory = db.prepare(
  'SELECT * FROM antibiogram_history ORDER BY drug_key, pathogen, year'
);

router.get('/antibiogram', (req, res, next) => {
  try {
    // Resolve requested year (default: latest in DB)
    const { max_year } = stmtMaxYear.get();
    const year = parseInt(req.query.year) || max_year || new Date().getFullYear();

    // ── antibiogram data ─────────────────────────────────────────────────────
    const rows = stmtAntibiogramRows.all(year);

    // Group into { pathogen → { antibiotics: { [drugKey]: {...} } } }
    const pathogenMap = {};
    for (const row of rows) {
      if (!pathogenMap[row.pathogen]) {
        pathogenMap[row.pathogen] = { pathogen: row.pathogen, antibiotics: {} };
      }
      pathogenMap[row.pathogen].antibiotics[row.drug_key] = {
        susceptibility: row.susceptibility,
        resistance:     row.resistance,
        trend:          row.trend,
      };
    }
    const data = Object.values(pathogenMap);

    // ── antibiotic metadata ──────────────────────────────────────────────────
    const drugRows = stmtAntibiotics.all();
    const antibioticMetadata = {};
    for (const d of drugRows) {
      antibioticMetadata[d.internal_key] = {
        name:           d.display_name,
        rxnormCui:      d.rxnorm_cui ?? null,
        spectrum:       d.spectrum,
        spectrumRank:   d.spectrum_rank,
        typicalDose:    d.typical_dose,
        crossReactivity: JSON.parse(d.cross_reactivity_classes || '[]'),
        firstLineFor:   JSON.parse(d.first_line_for || '[]'),
        renalAdjustment: d.renal_adjustment === 1,
      };
    }

    // ── historical resistance ─────────────────────────────────────────────────
    // Reconstruct composite keys that match antibiogram.js historicalResistance
    // e.g. drug_key="ciprofloxacin", pathogen="E. coli" → "ciprofloxacin_ecoli"
    const PATHOGEN_KEY_MAP = {
      'E. coli':           'ecoli',
      'S. pneumoniae':     'spneumo',
      'GAS (Group A Strep)': 'gas',
      'S. aureus (MSSA)':  'saureus',
      'H. influenzae':     'hinfluenzae',
      'M. catarrhalis':    'mcatarrhalis',
    };

    const histRows = stmtHistory.all();
    const historicalResistance = {};
    for (const h of histRows) {
      const suffix = PATHOGEN_KEY_MAP[h.pathogen] || h.pathogen.toLowerCase().replace(/[^a-z]/g, '');
      const compositeKey = `${h.drug_key}_${suffix}`;
      if (!historicalResistance[compositeKey]) historicalResistance[compositeKey] = [];
      historicalResistance[compositeKey].push({ year: h.year, resistance: h.resistance });
    }
    // Sort each series by year ascending
    for (const series of Object.values(historicalResistance)) {
      series.sort((a, b) => a.year - b.year);
    }

    res.json({
      facility: 'Metro General Hospital',
      year,
      data,
      antibioticMetadata,
      historicalResistance,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
