/**
 * FHIR R4 patient routes
 *
 * GET /api/fhir/status          — FHIR server health check
 * GET /api/fhir/patients        — list of patients (mapped to RxGuard schema)
 * GET /api/fhir/patients/:id    — single patient with all sub-resources assembled
 */

import { Router } from 'express';
import {
  fetchPatientList,
  fetchPatientById,
  fetchMedicationRequests,
  fetchObservations,
  fetchConditions,
  fetchAllergies,
} from '../services/fhirFetcher.js';
import { assemblePatient, mapPatient } from '../services/fhirMapper.js';

const router = Router();

const FHIR_BASE_URL = (process.env.FHIR_BASE_URL || 'https://hapi.fhir.org/baseR4').replace(/\/$/, '');
const PATIENT_COUNT = parseInt(process.env.FHIR_PATIENT_COUNT || '20', 10);

// ── GET /api/fhir/status ──────────────────────────────────────────────────────
router.get('/fhir/status', async (_req, res) => {
  try {
    const patients = await fetchPatientList(1);
    res.json({
      available: true,
      baseUrl: FHIR_BASE_URL,
      patientCount: patients.length,
    });
  } catch (err) {
    res.json({ available: false, baseUrl: FHIR_BASE_URL, error: err.message });
  }
});

// ── GET /api/fhir/patients ────────────────────────────────────────────────────
// Returns a lightweight list (no sub-resources) for populating the dropdown.
// Full details are fetched lazily via /api/fhir/patients/:id.
router.get('/fhir/patients', async (_req, res, next) => {
  try {
    const fhirPatients = await fetchPatientList(PATIENT_COUNT);

    // Return basic patient info synchronously; sub-resources are fetched on demand
    const patients = fhirPatients
      .filter(p => p.birthDate && (p.name?.length > 0))
      .map(p => {
        const base = mapPatient(p);
        return {
          ...base,
          // Placeholders so the dropdown can render immediately
          weight: null,
          scenario: 'Loading...',
          shouldGetAntibiotics: null,
          conditions: [],
          observations: [],
          allergies: [],
          currentMedications: [],
          currentMedicationDrugs: [],
          pastAntibiotics: [],
        };
      });

    res.json(patients);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/fhir/patients/:id ────────────────────────────────────────────────
// Fetches and assembles a full patient record with all sub-resources.
router.get('/fhir/patients/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const [fhirPatient, conditions, observations, allergies, medications] =
      await Promise.allSettled([
        fetchPatientById(id),
        fetchConditions(id),
        fetchObservations(id),
        fetchAllergies(id),
        fetchMedicationRequests(id),
      ]).then(results =>
        results.map((r, i) => {
          if (r.status === 'fulfilled') return r.value;
          console.warn(`[FHIR] Sub-resource fetch failed for patient ${id} (index ${i}):`, r.reason?.message);
          // Safe defaults for each resource type
          return i === 4 ? { active: [], completed: [] } : [];
        })
      );

    const patient = assemblePatient(
      fhirPatient,
      conditions,
      observations,
      allergies,
      medications
    );

    res.json(patient);
  } catch (err) {
    next(err);
  }
});

export default router;
