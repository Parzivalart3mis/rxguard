/**
 * SMART on FHIR client helpers
 *
 * Flow:
 *   1. Clinician opens app from EHR → EHR loads /launch.html
 *   2. /launch.html calls FHIR.oauth2.authorize() → redirects to SMART auth server
 *   3. Clinician logs in + selects patient in SMART sandbox
 *   4. SMART redirects back to app root with ?code=...&state=...
 *   5. App calls completeSmartAuth() → exchanges code for token, reads patient
 */

// fhirclient is loaded via CDN in index.html → available as window.FHIR
const getFHIR = () => window.FHIR;

/** The active SMART client after successful OAuth2 exchange */
let _client = null;

/**
 * Returns true when the current URL contains a SMART OAuth2 callback.
 * Called on app mount to detect EHR launch.
 */
export const isSmartCallback = () => {
  const p = new URLSearchParams(window.location.search);
  return p.has('code') && p.has('state');
};

/**
 * Completes the SMART auth flow: exchanges the OAuth2 code for a token,
 * reads the in-context patient, and returns a minimal RxGuard patient object.
 *
 * @returns {{ client: object, patient: object, serverUrl: string }}
 */
export const completeSmartAuth = async () => {
  _client = await getFHIR().oauth2.ready();
  const serverUrl = _client.state?.serverUrl || 'EHR';
  return { client: _client, serverUrl };
};

/** Returns the active SMART client, or null if no session exists. */
export const getSmartClient = () => _client;

/** True after a successful completeSmartAuth() call. */
export const hasSmartSession = () => !!_client;

/**
 * Creates a MedicationRequest on the SMART sandbox server using the
 * authorized client (carries the bearer token automatically).
 *
 * @param {object} rxData  - { antibiotic, displayName, dose, condition, duration }
 * @returns {object} Created FHIR MedicationRequest resource
 */
export const writeSmartMedicationRequest = async (rxData) => {
  if (!_client) throw new Error('No active SMART session');

  const resource = {
    resourceType: 'MedicationRequest',
    status: 'active',
    intent: 'order',
    meta: { tag: [{ system: 'http://rxguard.demo', code: 'demo' }] },
    subject: { reference: `Patient/${_client.patient.id}` },
    medicationCodeableConcept: { text: rxData.displayName || rxData.antibiotic },
    dosageInstruction: [{
      text: [rxData.dose, rxData.duration].filter(Boolean).join(' for ') || 'As directed',
    }],
    reasonCode: rxData.condition ? [{ text: rxData.condition }] : [],
    note: [{ text: 'Prescribed via RxGuard antibiotic stewardship plugin (demo)' }],
    authoredOn: new Date().toISOString(),
  };

  return await _client.create(resource);
};

