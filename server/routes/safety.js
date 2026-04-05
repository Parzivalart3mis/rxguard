import { Router } from 'express';
import { runSafetyChecks } from '../services/safetyEngine.js';

const router = Router();

/**
 * POST /api/safety/check
 *
 * Body: full discharge patient object
 * Returns: { alerts, stats, allAlerts, requiresAction }
 *
 * Response shape is identical to the client-side runSafetyChecks() so
 * DischargeWorkflow.jsx needs no rendering changes.
 */
router.post('/safety/check', (req, res, next) => {
  try {
    const patient = req.body;

    if (!patient || !patient.continuingMeds || !patient.labs) {
      return res.status(400).json({
        error: 'Invalid patient payload — must include continuingMeds, newMeds, labs, symptoms',
        code: 'INVALID_PATIENT',
      });
    }

    // Normalise missing optional arrays
    patient.newMeds  = patient.newMeds  || [];
    patient.symptoms = patient.symptoms || [];

    const result = runSafetyChecks(patient);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
