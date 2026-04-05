/**
 * FHIR R4 client factory
 *
 * Returns a thin wrapper around native fetch configured with the base URL
 * and optional Bearer token from environment variables.
 *
 * Swap this out for fhirclient's SMART launch flow when connecting to a
 * real EHR sandbox that requires SMART on FHIR auth.
 */

const DEFAULT_BASE_URL = 'https://hapi.fhir.org/baseR4';

export function getFhirClient() {
  const baseUrl = (process.env.FHIR_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  const authToken = process.env.FHIR_AUTH_TOKEN || '';

  const headers = {
    Accept: 'application/fhir+json',
    'Content-Type': 'application/fhir+json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return {
    baseUrl,
    /**
     * Perform a GET request against the FHIR server.
     * @param {string} path - relative path, e.g. "/Patient?_count=20"
     * @returns {Promise<object>} parsed JSON response
     */
    async get(path) {
      const url = `${baseUrl}${path}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`FHIR request failed: ${res.status} ${res.statusText} — ${url}`);
      }
      return res.json();
    },
  };
}
