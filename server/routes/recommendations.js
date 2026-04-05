/**
 * POST /api/recommendations
 *
 * Returns a complete prescribing-decision payload:
 *   - condition + conditionName + guideline metadata
 *   - top recommendation + ranked alternatives
 *   - assessment for selectedAntibiotic (if provided)
 *   - drug interactions for selectedAntibiotic vs. currentMedicationDrugs
 *   - class-level interaction alerts
 */

import { Router } from 'express';
import db from '../db/client.js';
import { getRecommendation, checkPrescribeInteractions } from '../services/recommendationEngine.js';
import { checkAllInteractions } from '../services/interactionChecker.js';

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

router.post('/recommendations', (req, res, next) => {
  try {
    const { patient, selectedAntibiotic } = req.body;

    if (!patient) {
      return res.status(400).json({ error: 'patient is required', code: 'MISSING_PATIENT' });
    }

    // Core recommendation
    const result = getRecommendation(patient, selectedAntibiotic || null);

    // Drug-drug interactions for the selected antibiotic vs. continuing meds
    const currentMeds = patient.currentMedicationDrugs || [];
    const interactions = selectedAntibiotic
      ? checkPrescribeInteractions(selectedAntibiotic, currentMeds)
      : [];

    // DB-driven interaction alerts (replaces former hardcoded checkClassInteractions)
    const drugInteractionsData = loadDrugInteractions();
    const classAlerts = selectedAntibiotic
      ? checkAllInteractions(
          {
            continuingMeds: currentMeds.map((m) => ({ drug: m.drug })),
            newMeds:        [{ drug: selectedAntibiotic }],
          },
          drugInteractionsData
        )
      : [];

    res.json({ ...result, interactions, classAlerts });
  } catch (err) {
    next(err);
  }
});

export default router;
