/**
 * useDischargePatients
 *
 * Returns a merged list of:
 *   1. Demo discharge patients (ddemo-*) — always present, instant
 *   2. FHIR patients mapped to the discharge schema — appended as they load
 *
 * Also exposes getDischargePatient(id) which:
 *   - For ddemo-* IDs: returns the local demo object
 *   - For fhir-* IDs: fetches full FHIR detail and maps to discharge schema
 */

import { useCallback, useMemo } from 'react';
import { dischargePatients as demoPatients } from '../data/dischargePatients.js';
import { usePatients } from './usePatients.js';

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

// ── LOINC helpers ─────────────────────────────────────────────────────────────

function buildObsMap(observations = []) {
  const map = new Map();
  for (const o of observations) {
    if (o.code)    map.set(o.code,    o);
    if (o.display) map.set(o.display, o);
  }
  return map;
}

function getObs(map, ...keys) {
  for (const k of keys) if (map.has(k)) return map.get(k);
  return null;
}

// ── FHIR prescribe patient → discharge patient schema ─────────────────────────

function mapFhirToDischarge(fp) {
  const obsMap = buildObsMap(fp.observations);

  // Labs
  const labs = {};
  const egfr       = getObs(obsMap, '62238-1', '33914-3', 'eGFR');
  const creatinine  = getObs(obsMap, '2160-0',  'Creatinine');
  const wbc         = getObs(obsMap, '6690-2',  'WBC count');
  const potassium   = getObs(obsMap, '2823-3',  'Potassium');
  const hemoglobin  = getObs(obsMap, '718-7',   'Hemoglobin');
  const pct         = getObs(obsMap, '33959-9', 'Procalcitonin');
  const crp         = getObs(obsMap, '1988-5',  'C-reactive protein');
  const nitrites    = getObs(obsMap, '5802-4',  'Nitrites in urine');
  if (egfr?.value       != null) labs.egfr         = egfr.value;
  if (creatinine?.value != null) labs.creatinine    = creatinine.value;
  if (wbc?.value        != null) labs.wbc           = wbc.value;
  if (potassium?.value  != null) labs.potassium     = potassium.value;
  if (hemoglobin?.value != null) labs.hemoglobin    = hemoglobin.value;
  if (pct?.value        != null) labs.procalcitonin = pct.value;
  if (crp?.value        != null) labs.crp           = crp.value;
  if (nitrites?.value)           labs.urine_nitrites = nitrites.value;

  // Vital signs
  const vitalSigns = {};
  const temp = getObs(obsMap, '8310-5', 'Body temperature');
  const hr   = getObs(obsMap, '8867-4', 'Heart rate');
  if (temp?.value != null) vitalSigns.temperature = temp.value;
  if (hr?.value   != null) vitalSigns.heartRate   = hr.value;

  // Symptoms: qualitative observations that aren't pure lab values
  const LAB_CODES = new Set([
    '8310-5','6690-2','1988-5','33959-9','62238-1','33914-3',
    '2160-0','2823-3','718-7','5802-4','5797-6','8867-4',
    '29463-7','59408-5',
  ]);
  const symptoms = (fp.observations || [])
    .filter(o => {
      if (LAB_CODES.has(o.code)) return false;
      if (typeof o.value !== 'string') return false;
      if (['absent', 'negative'].includes(o.value?.toLowerCase())) return false;
      return true;
    })
    .map(o => ({
      symptom: o.display,
      onset: o.date || null,
      severity: 'moderate',
      description: `${o.display}: ${o.value}`,
    }));

  // Continuing meds from FHIR active medication list
  const continuingMeds = (fp.currentMedicationDrugs || []).map(m => ({
    drug: m.drug,
    dose: 'as prescribed',
    frequency: 'as prescribed',
    startDate: null,
    reason: m.name,
  }));

  // Recent antibiotics (past 30 days) treated as newly prescribed meds
  const cutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const newMeds = (fp.pastAntibiotics || [])
    .filter(a => a.date && new Date(a.date).getTime() > cutoffMs)
    .map(a => ({
      drug: a.name.toLowerCase().replace(/\s+\d.*/, '').replace(/\s+/g, '_'),
      dose: 'as prescribed',
      frequency: 'as prescribed',
      duration: '7 days',
      startDate: a.date,
      reason: a.reason || 'Recent antibiotic course',
    }));

  const allergies = (fp.allergies || []).map(a => ({
    substance: a.substance,
    reaction: a.type || 'allergy',
  }));

  const conditions = (fp.conditions || []).map(c => c.display);

  const today = new Date().toISOString().split('T')[0];

  return {
    id: `fhir-${fp.id}`,
    _isFhir: true,
    _isDemo: false,
    name: fp.name,
    age: fp.age,
    sex: fp.gender,
    weight: fp.weight,
    demo: fp.scenario || conditions[0] || 'FHIR patient',
    continuingMeds,
    newMeds,
    stoppedMeds: [],
    labs,
    symptoms,
    allergies,
    conditions,
    vitalSigns,
    dischargeDate: today,
    admissionDate: fp.conditions?.[0]?.onset || today,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const DEMO = demoPatients.map(p => ({ ...p, _isDemo: true }));

export function useDischargePatients() {
  const { patients: allPrescribePatients, loading: fhirLoading, getPatient } = usePatients();

  // Map FHIR patients (non-demo) to discharge schema for the dropdown list
  const fhirDischargePatients = useMemo(() =>
    allPrescribePatients
      .filter(p => !p._isDemo)
      .map(mapFhirToDischarge),
    [allPrescribePatients]
  );

  const patients = useMemo(
    () => [...DEMO, ...fhirDischargePatients],
    [fhirDischargePatients]
  );

  /**
   * Resolve a full discharge patient by ID.
   * - ddemo-* → return from local demo array immediately
   * - fhir-*  → fetch full FHIR detail, re-map to discharge schema
   */
  const getDischargePatient = useCallback(async (id) => {
    if (String(id).startsWith('ddemo-')) {
      return DEMO.find(p => p.id === id) || null;
    }
    if (String(id).startsWith('fhir-')) {
      const fhirId = id.replace(/^fhir-/, '');
      const full = await getPatient(fhirId);
      return full ? mapFhirToDischarge(full) : null;
    }
    return patients.find(p => p.id === id) || null;
  }, [patients, getPatient]);

  return { patients, loading: USE_BACKEND && fhirLoading, getDischargePatient };
}
