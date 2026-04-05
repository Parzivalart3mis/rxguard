/**
 * FHIR R4 resource fetchers
 *
 * Each function fetches one resource type for a patient and returns the raw
 * FHIR Bundle (or Resource). Pagination is handled transparently — we collect
 * all pages up to a reasonable cap so callers always get a flat entry array.
 *
 * Results are cached in-process for CACHE_TTL_MS to avoid hammering the public
 * HAPI test server.
 */

import { getFhirClient } from './fhirClient.js';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map(); // key → { data, expiresAt }

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data;
}

function cacheSet(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Collect all entries across paginated Bundle responses (max 5 pages). */
async function fetchAllPages(client, path) {
  const entries = [];
  let nextUrl = null;
  let page = 0;
  const MAX_PAGES = 5;

  let bundle = await client.get(path);
  entries.push(...(bundle.entry || []));

  while (page < MAX_PAGES) {
    const nextLink = (bundle.link || []).find(l => l.relation === 'next');
    if (!nextLink) break;
    // nextLink.url is an absolute URL — strip the base for our client
    nextUrl = nextLink.url.replace(client.baseUrl, '');
    bundle = await client.get(nextUrl);
    entries.push(...(bundle.entry || []));
    page++;
  }

  return entries;
}

/**
 * Fetch a list of patients.
 * @param {number} count - max patients to fetch
 * @returns {Promise<object[]>} array of FHIR Patient resources
 */
export async function fetchPatientList(count = 20) {
  const cacheKey = `patient-list-${count}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const client = getFhirClient();
  const entries = await fetchAllPages(client, `/Patient?_count=${count}&_sort=-_lastUpdated`);
  const patients = entries
    .map(e => e.resource)
    .filter(r => r?.resourceType === 'Patient' && r.birthDate && r.name?.length > 0);

  cacheSet(cacheKey, patients);
  return patients;
}

/**
 * Fetch a single patient by FHIR ID.
 */
export async function fetchPatientById(fhirId) {
  const cacheKey = `patient-${fhirId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const client = getFhirClient();
  const resource = await client.get(`/Patient/${fhirId}`);
  cacheSet(cacheKey, resource);
  return resource;
}

/**
 * Fetch active MedicationRequests for a patient.
 */
export async function fetchMedicationRequests(fhirId) {
  const cacheKey = `medrequests-${fhirId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const client = getFhirClient();
  // Fetch active + completed (completed = past antibiotics)
  const [activeEntries, completedEntries] = await Promise.all([
    fetchAllPages(client, `/MedicationRequest?patient=${fhirId}&status=active&_count=50`),
    fetchAllPages(client, `/MedicationRequest?patient=${fhirId}&status=completed&_count=50`),
  ]);

  const result = {
    active: activeEntries.map(e => e.resource).filter(r => r?.resourceType === 'MedicationRequest'),
    completed: completedEntries.map(e => e.resource).filter(r => r?.resourceType === 'MedicationRequest'),
  };

  cacheSet(cacheKey, result);
  return result;
}

/**
 * Fetch recent Observations (vitals + labs) for a patient.
 */
export async function fetchObservations(fhirId) {
  const cacheKey = `observations-${fhirId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const client = getFhirClient();
  const entries = await fetchAllPages(
    client,
    `/Observation?patient=${fhirId}&_sort=-date&_count=100`
  );
  const observations = entries
    .map(e => e.resource)
    .filter(r => r?.resourceType === 'Observation');

  cacheSet(cacheKey, observations);
  return observations;
}

/**
 * Fetch active Conditions for a patient.
 */
export async function fetchConditions(fhirId) {
  const cacheKey = `conditions-${fhirId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const client = getFhirClient();
  const entries = await fetchAllPages(
    client,
    `/Condition?patient=${fhirId}&clinical-status=active&_count=50`
  );
  const conditions = entries
    .map(e => e.resource)
    .filter(r => r?.resourceType === 'Condition');

  cacheSet(cacheKey, conditions);
  return conditions;
}

/**
 * Fetch AllergyIntolerance resources for a patient.
 */
export async function fetchAllergies(fhirId) {
  const cacheKey = `allergies-${fhirId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const client = getFhirClient();
  const entries = await fetchAllPages(
    client,
    `/AllergyIntolerance?patient=${fhirId}&_count=50`
  );
  const allergies = entries
    .map(e => e.resource)
    .filter(r => r?.resourceType === 'AllergyIntolerance');

  cacheSet(cacheKey, allergies);
  return allergies;
}
