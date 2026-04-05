/**
 * FHIR R4 → RxGuard schema mapper
 *
 * Pure transformation functions. No network calls. Each mapper takes raw FHIR
 * resources (already fetched) and returns objects that match RxGuard's internal
 * patient schema.
 *
 * RxGuard patient schema:
 * {
 *   id, name, age, gender, weight,
 *   scenario, shouldGetAntibiotics, centorScore?,
 *   demographics: { birthDate, address },
 *   conditions:   [{ code, display, onset }],
 *   observations: [{ code, display, value, unit?, date }],
 *   allergies:    [{ substance, criticality, type }],
 *   currentMedications:     string[],
 *   currentMedicationDrugs: [{ drug, name }],
 *   pastAntibiotics:        [{ name, date, reason? }],
 * }
 */

// ── SNOMED CT → ICD-10 for the ~20 infection conditions relevant to RxGuard ──
const SNOMED_TO_ICD10 = {
  '363746003': 'J02.9',   // Pharyngitis
  '195662009': 'J02.9',   // Acute pharyngitis
  '43878008':  'J02.0',   // Streptococcal pharyngitis
  '444814009': 'J06.9',   // Viral upper respiratory tract infection
  '10509002':  'J06.9',   // Acute nasopharyngitis (common cold)
  '68281006':  'J20.9',   // Acute bronchitis
  '233604007': 'J18.9',   // Pneumonia
  '385093006': 'J18.9',   // Community-acquired pneumonia
  '40122008':  'J18.9',   // Pneumonia (general)
  '11381005':  'J01.90',  // Acute sinusitis
  '36971009':  'N30.0',   // Cystitis
  '30010008':  'N30.0',   // Acute cystitis
  '72621006':  'N10',     // Acute pyelonephritis
  '65363002':  'H66.9',   // Otitis media
  '3110003':   'H66.0',   // Acute suppurative otitis media
  '128045006': 'L03.90',  // Cellulitis
  '312099009': 'L03.90',  // Cellulitis of lower limb
  '76783007':  'A41.9',   // Sepsis
};

// ICD-10 prefixes where antibiotic prescribing is typically indicated
const ANTIBIOTIC_INDICATED_PREFIXES = new Set([
  'J18', 'J15', 'J14', 'J13', 'J12',  // Pneumonia
  'N30', 'N10', 'N11', 'N12',           // UTI / pyelonephritis
  'H66',                                 // Otitis media (bacterial)
  'J02.0',                               // Strep pharyngitis
  'L03',                                 // Cellulitis
  'J01.0', 'J01.1', 'J01.2', 'J01.3',  // Acute bacterial sinusitis
  'A41', 'A40',                          // Sepsis / bacteraemia
  'K57', 'K35',                          // Diverticulitis / appendicitis
]);

// ICD-10 codes / prefixes where antibiotics are NOT indicated
const ANTIBIOTIC_NOT_INDICATED_PREFIXES = new Set([
  'J02.9',  // Pharyngitis unspecified (likely viral)
  'J06',    // Acute upper respiratory infection (viral)
  'J00',    // Common cold
  'J20',    // Acute bronchitis (mostly viral)
  'J11',    // Influenza
  'J10',    // Influenza
  'B34',    // Viral infection unspecified
]);

// Known antibiotic drug name fragments (lowercase) for identifying past antibiotics
const ANTIBIOTIC_KEYWORDS = [
  'amoxicillin', 'amoxiclav', 'augmentin', 'ampicillin',
  'azithromycin', 'clarithromycin', 'erythromycin',
  'ciprofloxacin', 'levofloxacin', 'moxifloxacin',
  'doxycycline', 'minocycline', 'tetracycline',
  'trimethoprim', 'sulfamethoxazole', 'bactrim', 'septrin',
  'nitrofurantoin',
  'cephalexin', 'cefuroxime', 'ceftriaxone', 'cefazolin', 'cefalexin',
  'metronidazole', 'flagyl',
  'clindamycin',
  'vancomycin', 'linezolid',
  'piperacillin', 'tazobactam',
  'meropenem', 'imipenem', 'ertapenem',
  'gentamicin', 'tobramycin', 'amikacin',
  'penicillin',
];

function isAntibiotic(displayName) {
  if (!displayName) return false;
  const lower = displayName.toLowerCase();
  return ANTIBIOTIC_KEYWORDS.some(kw => lower.includes(kw));
}

// ── Helper: extract preferred coding from a CodeableConcept ──────────────────

function extractCoding(codeableConcept, preferredSystems = []) {
  if (!codeableConcept?.coding?.length) return null;
  for (const system of preferredSystems) {
    const match = codeableConcept.coding.find(c => c.system === system);
    if (match) return match;
  }
  return codeableConcept.coding[0];
}

function getIcd10Code(codeableConcept) {
  const icd = extractCoding(codeableConcept, [
    'http://hl7.org/fhir/sid/icd-10-cm',
    'http://hl7.org/fhir/sid/icd-10',
    'http://hl7.org/fhir/sid/icd10',
  ]);
  if (icd) return { code: icd.code, display: icd.display || codeableConcept.text || icd.code };

  // Try converting SNOMED
  const snomed = extractCoding(codeableConcept, ['http://snomed.info/sct']);
  if (snomed && SNOMED_TO_ICD10[snomed.code]) {
    return {
      code: SNOMED_TO_ICD10[snomed.code],
      display: snomed.display || codeableConcept.text || snomed.code,
    };
  }

  // Fall back to whatever is available
  const fallback = codeableConcept.coding[0];
  return { code: fallback?.code || 'unknown', display: fallback?.display || codeableConcept.text || 'Unknown condition' };
}

// ── Age calculation ──────────────────────────────────────────────────────────

function ageFromBirthDate(birthDate) {
  if (!birthDate) return null;
  const ms = Date.now() - new Date(birthDate).getTime();
  return Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
}

// ── Weight normalisation (FHIR may store in lbs) ────────────────────────────

function toKg(value, unit) {
  if (!unit) return value;
  const u = unit.toLowerCase();
  if (u === '[lb_av]' || u === 'lbs' || u === 'lb') return Math.round(value * 0.453592 * 10) / 10;
  return value;
}

// ── Medication display name extraction ──────────────────────────────────────

function getMedicationDisplay(medRequest) {
  // Prefer medicationCodeableConcept
  if (medRequest.medicationCodeableConcept) {
    return (
      medRequest.medicationCodeableConcept.text ||
      medRequest.medicationCodeableConcept.coding?.[0]?.display ||
      null
    );
  }
  // medicationReference: we can only use the display hint if present
  if (medRequest.medicationReference?.display) {
    return medRequest.medicationReference.display;
  }
  return null;
}

/** Normalise a medication display name to a simple lowercase drug key. */
function normalizeDrugKey(displayName) {
  if (!displayName) return null;
  return displayName
    .toLowerCase()
    .replace(/\s+\d+(\.\d+)?\s*(mg|mcg|g|ml|units?|iu)\b.*/i, '') // strip dosage
    .replace(/\s+(oral|tablet|capsule|injection|solution|topical|cream|gel|patch)\b.*/i, '') // strip route
    .replace(/\s+\(.*?\)/g, '')  // strip parentheticals
    .trim()
    .replace(/\s+/g, '-');       // spaces → hyphens for key style
}

// ── Derive scenario string from conditions ───────────────────────────────────

function deriveScenario(mappedConditions) {
  if (!mappedConditions.length) return 'Unknown presentation';
  return mappedConditions[0].display;
}

// ── Derive shouldGetAntibiotics from ICD-10 codes ───────────────────────────

function deriveAntibioticIndication(mappedConditions) {
  for (const c of mappedConditions) {
    const code = c.code || '';
    if (ANTIBIOTIC_NOT_INDICATED_PREFIXES.has(code) ||
        [...ANTIBIOTIC_NOT_INDICATED_PREFIXES].some(p => code.startsWith(p))) {
      return false;
    }
    if (ANTIBIOTIC_INDICATED_PREFIXES.has(code) ||
        [...ANTIBIOTIC_INDICATED_PREFIXES].some(p => code.startsWith(p))) {
      return true;
    }
  }
  return null; // unknown / not enough info
}

// ── Public mappers ───────────────────────────────────────────────────────────

/**
 * Map a FHIR Patient resource to basic RxGuard demographics.
 */
export function mapPatient(fhirPatient) {
  const nameEntry = fhirPatient.name?.[0];
  let name = nameEntry?.text;
  if (!name && nameEntry) {
    const given = (nameEntry.given || []).join(' ');
    const family = nameEntry.family || '';
    name = [given, family].filter(Boolean).join(' ');
  }
  name = name || `Patient ${fhirPatient.id}`;

  const addressEntry = fhirPatient.address?.[0];
  const addressParts = [
    ...(addressEntry?.line || []),
    addressEntry?.city,
    addressEntry?.state,
    addressEntry?.postalCode,
  ].filter(Boolean);

  return {
    id: fhirPatient.id,
    name,
    age: ageFromBirthDate(fhirPatient.birthDate),
    gender: fhirPatient.gender || 'unknown',
    weight: null, // populated later from Observations
    demographics: {
      birthDate: fhirPatient.birthDate || null,
      address: addressParts.join(', ') || null,
    },
  };
}

/**
 * Map an array of FHIR Condition resources to RxGuard conditions[].
 */
export function mapConditions(fhirConditions) {
  return fhirConditions
    .map(c => {
      const { code, display } = getIcd10Code(c.code);
      const onset = c.onsetDateTime || c.onsetPeriod?.start || c.recordedDate || null;
      return { code, display, onset };
    })
    .filter(c => c.code !== 'unknown');
}

/**
 * Map an array of FHIR Observation resources to RxGuard observations[].
 * Also extracts weight (LOINC 29463-7) separately.
 */
export function mapObservations(fhirObservations) {
  const observations = [];
  let weightKg = null;

  const LOINC_SYSTEM = 'http://loinc.org';

  for (const obs of fhirObservations) {
    const loinc = extractCoding(obs.code, [LOINC_SYSTEM]);
    const code = loinc?.code || obs.code?.coding?.[0]?.code || obs.code?.text || null;
    const display = loinc?.display || obs.code?.text || obs.code?.coding?.[0]?.display || code;

    let value, unit;

    if (obs.valueQuantity) {
      value = obs.valueQuantity.value;
      unit = obs.valueQuantity.unit || obs.valueQuantity.code;
      // Normalise weight
      if (code === '29463-7') {
        weightKg = toKg(value, unit);
        continue; // weight goes into patient.weight, not observations[]
      }
    } else if (obs.valueCodeableConcept) {
      value = obs.valueCodeableConcept.text || obs.valueCodeableConcept.coding?.[0]?.display;
    } else if (typeof obs.valueString === 'string') {
      value = obs.valueString;
    } else if (typeof obs.valueBoolean === 'boolean') {
      value = obs.valueBoolean ? 'present' : 'absent';
    } else {
      // Observation has no value — could be a panel header; skip
      continue;
    }

    if (code === null || value === undefined) continue;

    observations.push({
      code,
      display: display || code,
      value,
      ...(unit ? { unit } : {}),
      date: obs.effectiveDateTime || obs.effectivePeriod?.start || obs.issued || null,
    });
  }

  return { observations, weightKg };
}

/**
 * Map an array of FHIR AllergyIntolerance resources to RxGuard allergies[].
 */
export function mapAllergies(fhirAllergies) {
  return fhirAllergies.map(a => ({
    substance: a.code?.text || a.code?.coding?.[0]?.display || 'Unknown substance',
    criticality: a.criticality || 'unknown',
    type: a.type || 'allergy',
  }));
}

/**
 * Map arrays of active + completed FHIR MedicationRequest resources.
 * Returns currentMedications, currentMedicationDrugs, and pastAntibiotics.
 */
export function mapMedications(activeMedRequests, completedMedRequests) {
  const currentMedications = [];
  const currentMedicationDrugs = [];

  for (const mr of activeMedRequests) {
    const display = getMedicationDisplay(mr);
    if (!display) continue;
    currentMedications.push(display);
    const key = normalizeDrugKey(display);
    if (key) currentMedicationDrugs.push({ drug: key, name: display });
  }

  const pastAntibiotics = [];
  for (const mr of completedMedRequests) {
    const display = getMedicationDisplay(mr);
    if (!display || !isAntibiotic(display)) continue;
    const date =
      mr.dispenseRequest?.validityPeriod?.end ||
      mr.authoredOn ||
      null;
    pastAntibiotics.push({
      name: display,
      date,
      reason: mr.reasonCode?.[0]?.text || mr.reasonCode?.[0]?.coding?.[0]?.display || null,
    });
  }

  return { currentMedications, currentMedicationDrugs, pastAntibiotics };
}

/**
 * Assemble a complete RxGuard patient object from all mapped sub-resources.
 */
export function assemblePatient(fhirPatient, conditions, observations, allergies, medications) {
  const base = mapPatient(fhirPatient);
  const mappedConditions = mapConditions(conditions);
  const { observations: mappedObs, weightKg } = mapObservations(observations);
  const mappedAllergies = mapAllergies(allergies);
  const { currentMedications, currentMedicationDrugs, pastAntibiotics } =
    mapMedications(medications.active, medications.completed);

  return {
    ...base,
    weight: weightKg,
    scenario: deriveScenario(mappedConditions),
    shouldGetAntibiotics: deriveAntibioticIndication(mappedConditions),
    conditions: mappedConditions,
    observations: mappedObs,
    allergies: mappedAllergies,
    currentMedications,
    currentMedicationDrugs,
    pastAntibiotics,
  };
}
