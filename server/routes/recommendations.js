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
import { getRecommendation, checkPrescribeInteractions } from '../services/recommendationEngine.js';
import { checkClassInteractions } from '../services/interactionChecker.js';

const router = Router();

router.post('/recommendations', (req, res, next) => {
  try {
    const { patient, selectedAntibiotic } = req.body;

    if (!patient) {
      return res.status(400).json({ error: 'patient is required', code: 'MISSING_PATIENT' });
    }

    // Core recommendation
    const result = getRecommendation(patient, selectedAntibiotic || null);

    // Drug-drug interactions for the selected antibiotic vs. continuing meds
    // patient.currentMedicationDrugs: [{ drug: 'warfarin', name: 'Warfarin' }]
    const currentMeds = patient.currentMedicationDrugs || [];
    const interactions = selectedAntibiotic
      ? checkPrescribeInteractions(selectedAntibiotic, currentMeds)
      : [];

    // Class-level alerts (uses same server-side checker as safety route)
    // Build a patient-like object in the format checkClassInteractions expects
    const classAlerts = selectedAntibiotic
      ? checkClassInteractions({
          continuingMeds: currentMeds.map((m) => ({ drug: m.drug })),
          newMeds:        [{ drug: selectedAntibiotic }],
        })
      : [];

    res.json({ ...result, interactions, classAlerts });
  } catch (err) {
    next(err);
  }
});

export default router;
