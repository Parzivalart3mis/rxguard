import { Router } from 'express';
import db from '../db/client.js';
import { checkAllInteractions, checkClassInteractions } from '../services/interactionChecker.js';

const router = Router();

function loadDrugInteractions() {
  return db
    .prepare('SELECT * FROM drug_interactions WHERE is_active = 1')
    .all()
    .map((r) => ({
      drug_a:    r.drug_a_key,
      drug_b:    r.drug_b_key,
      severity:  r.severity,
      effect:    r.effect,
      mechanism: r.mechanism,
      action:    r.action,
    }));
}

/**
 * POST /api/interactions/check
 *
 * Body: { continuingMeds: [...], newMeds: [...] }
 * Returns: { interactions, classAlerts, summary }
 */
router.post('/interactions/check', (req, res, next) => {
  try {
    const { continuingMeds = [], newMeds = [] } = req.body;

    const patient = { continuingMeds, newMeds, symptoms: [] };
    const drugInteractionsData = loadDrugInteractions();

    const interactions = checkAllInteractions(patient, drugInteractionsData);
    const classAlerts  = checkClassInteractions(patient);

    const summary = {
      major:    interactions.filter((i) => i.severity === 'major').length,
      moderate: interactions.filter((i) => i.severity === 'moderate').length,
      minor:    interactions.filter((i) => i.severity === 'minor').length,
    };

    res.json({ interactions, classAlerts, summary });
  } catch (err) {
    next(err);
  }
});

export default router;
