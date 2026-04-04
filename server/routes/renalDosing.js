import { Router } from 'express';
import db from '../db/client.js';
import { checkRenalDosing, checkAKIRisk, getKidneyFunctionStage } from '../services/renalDosingChecker.js';

const router = Router();

function loadRenalDosingRules() {
  const rows = db
    .prepare(`
      SELECT rdr.*, d.drug_class as class_name
      FROM renal_dosing_rules rdr
      LEFT JOIN drugs d ON d.internal_key = rdr.drug_key
      WHERE rdr.is_active = 1
      ORDER BY rdr.drug_key, rdr.egfr_threshold DESC
    `)
    .all();

  const rules = {};
  for (const row of rows) {
    if (!rules[row.drug_key]) {
      rules[row.drug_key] = {
        drug:         row.drug_key,
        class:        row.class_name || row.drug_key,
        requirements: [],
      };
    }
    rules[row.drug_key].requirements.push({
      egfr_threshold: row.egfr_threshold,
      action:         row.action,
      message:        row.message,
      severity:       row.severity,
    });
  }
  return rules;
}

/**
 * POST /api/renal/check
 *
 * Body: { continuingMeds: [...], newMeds: [...], egfr: number }
 * Returns: { renalAlerts, akiRisks, kidneyStage }
 */
router.post('/renal/check', (req, res, next) => {
  try {
    const { continuingMeds = [], newMeds = [], egfr } = req.body;

    if (egfr === undefined || egfr === null) {
      return res.status(400).json({ error: 'egfr is required', code: 'MISSING_EGFR' });
    }

    const patient = {
      continuingMeds,
      newMeds,
      symptoms: [],
      labs: { egfr: Number(egfr) },
    };

    const renalDosingRulesData = loadRenalDosingRules();
    const renalAlerts          = checkRenalDosing(patient, renalDosingRulesData);
    const akiRisks             = checkAKIRisk(patient);
    const kidneyStage          = getKidneyFunctionStage(patient.labs.egfr);

    res.json({ renalAlerts, akiRisks, kidneyStage });
  } catch (err) {
    next(err);
  }
});

export default router;
