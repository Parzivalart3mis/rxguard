import { Router } from 'express';
import db from '../db/client.js';

const router = Router();

/**
 * GET /api/drugs/side-effects?keys=lisinopril,furosemide,...
 *
 * Returns a map of { [drug_key]: { class, side_effects: [...] } }
 * shaped identically to drugSideEffects.js so WatchOutSymptomCard
 * needs only a prop change, not a logic change.
 */
router.get('/drugs/side-effects', (req, res, next) => {
  try {
    const rawKeys = req.query.keys;
    if (!rawKeys) {
      return res.status(400).json({ error: 'keys query param required', code: 'MISSING_KEYS' });
    }

    const keys = rawKeys.split(',').map((k) => k.trim()).filter(Boolean);
    if (keys.length === 0) {
      return res.json({});
    }

    // Fetch all active side effects for the requested drug keys
    const placeholders = keys.map(() => '?').join(',');
    const rows = db
      .prepare(`
        SELECT dse.drug_key, dse.symptom, dse.frequency, dse.frequency_pct,
               dse.onset, dse.description, d.drug_class
        FROM drug_side_effects dse
        LEFT JOIN drugs d ON d.internal_key = dse.drug_key
        WHERE dse.is_active = 1 AND dse.drug_key IN (${placeholders})
        ORDER BY dse.drug_key, dse.frequency
      `)
      .all(...keys);

    // Build the same shape as drugSideEffects.js
    const result = {};
    for (const row of rows) {
      if (!result[row.drug_key]) {
        result[row.drug_key] = { class: row.drug_class || row.drug_key, side_effects: [] };
      }
      result[row.drug_key].side_effects.push({
        symptom:     row.symptom,
        frequency:   row.frequency,
        pct:         row.frequency_pct,
        onset:       row.onset,
        description: row.description,
      });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
