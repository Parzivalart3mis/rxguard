import { Router } from 'express';
import db from '../db/client.js';
import { getSideEffectsMap } from '../services/sideEffectsFetcher.js';

const router = Router();

/**
 * GET /api/drugs/side-effects?keys=lisinopril,furosemide,...
 *
 * Returns a map of { [drug_key]: { class, side_effects: [...] } }
 * shaped identically to drugSideEffects.js so WatchOutSymptomCard
 * needs only a prop change, not a logic change.
 *
 * Cache hit  → served from SQLite instantly.
 * Cache miss → fetched from OpenFDA, parsed by Groq, cached, then returned.
 * Stale (>30 days) → stale data returned immediately; refresh happens in background.
 */
router.get('/drugs/side-effects', async (req, res, next) => {
  try {
    const rawKeys = req.query.keys;
    if (!rawKeys) {
      return res.status(400).json({ error: 'keys query param required', code: 'MISSING_KEYS' });
    }

    const keys = rawKeys.split(',').map((k) => k.trim()).filter(Boolean);
    if (keys.length === 0) {
      return res.json({});
    }

    // Check which keys are already cached and fresh — return those immediately
    // while triggering background fetches for the rest.
    const sideEffectsMap = await getSideEffectsMap(keys);

    // Strip internal _cachedAt field before sending to client
    const response = {};
    for (const [key, val] of Object.entries(sideEffectsMap)) {
      if (val) {
        const { _cachedAt, ...rest } = val;
        response[key] = rest;
      }
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
