/**
 * usePatients — merged demo + FHIR patient list
 *
 * Always returns the 10 curated demo patients first, followed by live FHIR
 * patients when VITE_USE_BACKEND=true and the server is reachable.
 *
 * Returns:
 *   patients     — demo patients + FHIR patients (demo always first)
 *   loading      — true while FHIR fetch is in flight
 *   fhirError    — Error if FHIR fetch failed (demo patients still shown)
 *   getPatient(id) — returns full detail; demo IDs resolved locally, FHIR IDs fetched
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { patients as demoPatients } from '../data/patients.js';

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

// Tag every demo patient with _isDemo so PatientSelector can group them
const DEMO = demoPatients.map(p => ({ ...p, _isDemo: true }));

export function usePatients() {
  const [fhirPatients, setFhirPatients] = useState([]);
  const [loading,      setLoading]      = useState(USE_BACKEND);
  const [fhirError,    setFhirError]    = useState(null);

  useEffect(() => {
    if (!USE_BACKEND) return;

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/fhir/patients');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        // Tag FHIR patients so PatientSelector can show them in a separate group
        setFhirPatients((Array.isArray(data) ? data : []).map(p => ({ ...p, _isDemo: false })));
      } catch (err) {
        if (cancelled) return;
        console.warn('[usePatients] FHIR fetch failed — showing demo patients only:', err.message);
        setFhirError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Demo patients always come first; FHIR patients append after
  const patients = useMemo(() => [...DEMO, ...fhirPatients], [fhirPatients]);

  /**
   * Resolve a patient's full detail.
   * - demo-* IDs → return from local DEMO array (no network call)
   * - anything else → fetch /api/fhir/patients/:id
   */
  const getPatient = useCallback(async (id) => {
    if (String(id).startsWith('demo-')) {
      return DEMO.find(p => p.id === id) || null;
    }
    if (!USE_BACKEND) return patients.find(p => p.id === id) || null;
    try {
      const res = await fetch(`/api/fhir/patients/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { ...data, _isDemo: false };
    } catch (err) {
      console.warn(`[usePatients] Detail fetch failed for ${id}:`, err.message);
      return patients.find(p => p.id === id) || null;
    }
  }, [patients]);

  return { patients, loading, fhirError, getPatient };
}
