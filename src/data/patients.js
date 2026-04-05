/**
 * RxGuard Demo Patients
 *
 * 10 curated cases covering every bacterial stewardship category.
 * IDs are prefixed "demo-" so they never collide with live FHIR IDs.
 * Observations carry both LOINC codes (code field) and display names so
 * the scoring engine finds them regardless of the lookup path.
 */

export const patients = [
  // ── 1. Strep Pharyngitis — antibiotics INDICATED ───────────────────────────
  {
    id: 'demo-1',
    _isDemo: true,
    name: 'Emma Thompson',
    age: 19,
    gender: 'female',
    weight: 61,
    scenario: 'Strep pharyngitis — high Centor score',
    shouldGetAntibiotics: true,
    centorScore: 4,
    demographics: { birthDate: '2006-03-08', address: '14 Beacon St, Boston, MA' },
    conditions: [
      { code: 'J02.0', display: 'Streptococcal pharyngitis', onset: '2026-04-02' },
    ],
    observations: [
      { code: '8310-5',   display: 'Body temperature',                       value: 38.6, unit: '°C',     date: '2026-04-04' },
      { code: '33717-0',  display: 'Cough',                                  value: 'absent',              date: '2026-04-04' },
      { code: '664-3',    display: 'Tonsillar swelling/exudate',              value: 'present',             date: '2026-04-04' },
      { code: 'LA16480-2',display: 'Tender anterior cervical lymphadenopathy',value: 'present',             date: '2026-04-04' },
      { code: '6690-2',   display: 'WBC count',                              value: 13.4, unit: '10^9/L',  date: '2026-04-04' },
      { code: '1988-5',   display: 'C-reactive protein',                     value: 48,   unit: 'mg/L',    date: '2026-04-04' },
    ],
    allergies: [],
    currentMedications: [],
    currentMedicationDrugs: [],
    pastAntibiotics: [],
  },

  // ── 2. Viral Pharyngitis — antibiotics NOT indicated ──────────────────────
  {
    id: 'demo-2',
    _isDemo: true,
    name: 'John Miller',
    age: 34,
    gender: 'male',
    weight: 78,
    scenario: 'Viral pharyngitis — low Centor score',
    shouldGetAntibiotics: false,
    centorScore: 1,
    demographics: { birthDate: '1991-03-15', address: '123 Main St, Boston, MA' },
    conditions: [
      { code: 'J02.9', display: 'Acute pharyngitis, unspecified', onset: '2026-04-01' },
    ],
    observations: [
      { code: '8310-5',   display: 'Body temperature',                       value: 37.0, unit: '°C',    date: '2026-04-04' },
      { code: '33717-0',  display: 'Cough',                                  value: 'present',            date: '2026-04-04' },
      { code: '664-3',    display: 'Tonsillar exudate',                       value: 'absent',             date: '2026-04-04' },
      { code: 'LA16480-2',display: 'Tender cervical lymphadenopathy',         value: 'absent',             date: '2026-04-04' },
      { code: '6690-2',   display: 'WBC count',                              value: 7.2,  unit: '10^9/L', date: '2026-04-04' },
      { code: '33959-9',  display: 'Procalcitonin',                          value: 0.04, unit: 'ng/mL',  date: '2026-04-04' },
    ],
    allergies: [],
    currentMedications: [],
    currentMedicationDrugs: [],
    pastAntibiotics: [],
  },

  // ── 3. Uncomplicated UTI — antibiotics INDICATED ──────────────────────────
  {
    id: 'demo-3',
    _isDemo: true,
    name: 'Sarah Chen',
    age: 28,
    gender: 'female',
    weight: 62,
    scenario: 'Uncomplicated UTI (acute cystitis)',
    shouldGetAntibiotics: true,
    demographics: { birthDate: '1997-07-22', address: '456 Oak Ave, Seattle, WA' },
    conditions: [
      { code: 'N30.0', display: 'Acute cystitis', onset: '2026-04-03' },
    ],
    observations: [
      { code: '8310-5',    display: 'Body temperature',  value: 37.2, unit: '°C',    date: '2026-04-04' },
      { code: '49650-1',   display: 'Dysuria',           value: 'present',            date: '2026-04-04' },
      { code: '198130006', display: 'Urinary frequency', value: 'present',            date: '2026-04-04' },
      { code: '33905-1',   display: 'Vaginal discharge', value: 'absent',             date: '2026-04-04' },
      { code: '5802-4',    display: 'Nitrites in urine', value: 'positive',           date: '2026-04-04' },
      { code: '5797-6',    display: 'Leukocyte esterase',value: 'positive',           date: '2026-04-04' },
      { code: '6690-2',    display: 'WBC count',         value: 9.1, unit: '10^9/L', date: '2026-04-04' },
    ],
    allergies: [],
    currentMedications: ['Levonorgestrel 0.1 mg / EE 20 mcg (Oral contraceptive)'],
    currentMedicationDrugs: [{ drug: 'levonorgestrel', name: 'Levonorgestrel / EE (OCP)' }],
    pastAntibiotics: [
      { name: 'Nitrofurantoin', date: '2025-08-15', reason: 'Prior UTI' },
    ],
  },

  // ── 4. Complicated / Recurrent UTI — antibiotics INDICATED ───────────────
  {
    id: 'demo-4',
    _isDemo: true,
    name: 'James Wilson',
    age: 72,
    gender: 'male',
    weight: 75,
    scenario: 'Recurrent UTI — elderly diabetic, penicillin allergy',
    shouldGetAntibiotics: true,
    demographics: { birthDate: '1953-04-03', address: '999 Birch St, Miami, FL' },
    conditions: [
      { code: 'N30.0', display: 'Recurrent urinary tract infection', onset: '2026-04-01' },
      { code: 'E11.9', display: 'Type 2 diabetes mellitus without complications', onset: '2015-06-10' },
      { code: 'I10',   display: 'Essential hypertension', onset: '2012-01-01' },
    ],
    observations: [
      { code: '8310-5',    display: 'Body temperature',  value: 37.4, unit: '°C',    date: '2026-04-04' },
      { code: '49650-1',   display: 'Dysuria',           value: 'present',            date: '2026-04-04' },
      { code: '198130006', display: 'Urinary frequency', value: 'present',            date: '2026-04-04' },
      { code: '5802-4',    display: 'Nitrites in urine', value: 'positive',           date: '2026-04-04' },
      { code: '5797-6',    display: 'Leukocyte esterase',value: 'positive',           date: '2026-04-04' },
      { code: '630-4',     display: 'Urine culture',     value: 'E. coli > 100,000 CFU/mL', date: '2026-04-04' },
      { code: '6690-2',    display: 'WBC count',         value: 9.8,  unit: '10^9/L', date: '2026-04-04' },
      { code: '62238-1',   display: 'eGFR',              value: 52,   unit: 'mL/min', date: '2026-04-04' },
    ],
    allergies: [
      { substance: 'Penicillin', criticality: 'high', type: 'allergy' },
    ],
    currentMedications: ['Metformin 1000 mg BID', 'Amlodipine 5 mg daily'],
    currentMedicationDrugs: [
      { drug: 'metformin',   name: 'Metformin 1000 mg BID' },
      { drug: 'amlodipine',  name: 'Amlodipine 5 mg daily' },
    ],
    pastAntibiotics: [
      { name: 'TMP-SMX', date: '2026-01-20', reason: 'Prior UTI' },
    ],
  },

  // ── 5. Community-acquired Pneumonia — antibiotics INDICATED ───────────────
  {
    id: 'demo-5',
    _isDemo: true,
    name: 'Robert Johnson',
    age: 67,
    gender: 'male',
    weight: 82,
    scenario: 'Community-acquired pneumonia — moderate severity',
    shouldGetAntibiotics: true,
    demographics: { birthDate: '1958-11-08', address: '789 Pine Rd, Denver, CO' },
    conditions: [
      { code: 'J18.1', display: 'Lobar pneumonia, unspecified organism', onset: '2026-04-02' },
    ],
    observations: [
      { code: '8310-5',    display: 'Body temperature',        value: 38.9, unit: '°C',    date: '2026-04-04' },
      { code: '33717-0',   display: 'Cough',                   value: 'productive',         date: '2026-04-04' },
      { code: '6690-2',    display: 'WBC count',               value: 14.8, unit: '10^9/L', date: '2026-04-04' },
      { code: '1988-5',    display: 'C-reactive protein',      value: 156,  unit: 'mg/L',   date: '2026-04-04' },
      { code: '33959-9',   display: 'Procalcitonin',           value: 0.82, unit: 'ng/mL',  date: '2026-04-04' },
      { code: '36728-3',   display: 'Chest X-ray consolidation', value: 'right lower lobe', date: '2026-04-04' },
      { code: '59408-5',   display: 'Oxygen saturation',       value: 93,   unit: '%',      date: '2026-04-04' },
      { code: '62238-1',   display: 'eGFR',                    value: 68,   unit: 'mL/min', date: '2026-04-04' },
    ],
    allergies: [],
    currentMedications: ['Lisinopril 10 mg daily', 'Metformin 500 mg BID', 'Atorvastatin 20 mg daily'],
    currentMedicationDrugs: [
      { drug: 'lisinopril',   name: 'Lisinopril 10 mg daily' },
      { drug: 'metformin',    name: 'Metformin 500 mg BID' },
      { drug: 'atorvastatin', name: 'Atorvastatin 20 mg daily' },
    ],
    pastAntibiotics: [],
  },

  // ── 6. Acute Otitis Media — antibiotics INDICATED ─────────────────────────
  {
    id: 'demo-6',
    _isDemo: true,
    name: 'Emily Davis',
    age: 8,
    gender: 'female',
    weight: 26,
    scenario: 'Acute otitis media — bulging TM with fever',
    shouldGetAntibiotics: true,
    demographics: { birthDate: '2017-05-12', address: '321 Elm St, Portland, OR' },
    conditions: [
      { code: 'H66.0', display: 'Acute suppurative otitis media', onset: '2026-04-03' },
    ],
    observations: [
      { code: '8310-5',    display: 'Body temperature',           value: 39.0, unit: '°C',    date: '2026-04-04' },
      { code: 'LA18314-8', display: 'Bulging tympanic membrane',  value: 'present',            date: '2026-04-04' },
      { code: 'LA18313-0', display: 'Ear pain',                   value: 'present',            date: '2026-04-04' },
      { code: '6690-2',    display: 'WBC count',                  value: 11.2, unit: '10^9/L', date: '2026-04-04' },
      { code: '1988-5',    display: 'C-reactive protein',         value: 55,   unit: 'mg/L',   date: '2026-04-04' },
    ],
    allergies: [],
    currentMedications: [],
    currentMedicationDrugs: [],
    pastAntibiotics: [
      { name: 'Amoxicillin', date: '2025-11-10', reason: 'Prior ear infection' },
    ],
  },

  // ── 7. Acute Bacterial Sinusitis — antibiotics INDICATED ─────────────────
  {
    id: 'demo-7',
    _isDemo: true,
    name: 'Maria Santos',
    age: 38,
    gender: 'female',
    weight: 65,
    scenario: 'Acute bacterial sinusitis — biphasic, >10 days',
    shouldGetAntibiotics: true,
    demographics: { birthDate: '1987-01-15', address: '333 Palm St, Orlando, FL' },
    conditions: [
      { code: 'J01.00', display: 'Acute maxillary sinusitis, unspecified', onset: '2026-03-21' },
    ],
    observations: [
      { code: '8310-5',    display: 'Body temperature',     value: 38.0, unit: '°C',    date: '2026-04-04' },
      { code: 'duration',  display: 'Duration of symptoms', value: '14 days',            date: '2026-04-04' },
      { code: '448651000', display: 'Biphasic illness',     value: 'yes - worsened after initial improvement', date: '2026-04-04' },
      { code: '271587009', display: 'Facial pain',          value: 'present',            date: '2026-04-04' },
      { code: '33959-6',   display: 'Nasal discharge',      value: 'purulent',           date: '2026-04-04' },
      { code: '6690-2',    display: 'WBC count',            value: 9.2,  unit: '10^9/L', date: '2026-04-04' },
      { code: '1988-5',    display: 'C-reactive protein',   value: 38,   unit: 'mg/L',   date: '2026-04-04' },
    ],
    allergies: [],
    currentMedications: [],
    currentMedicationDrugs: [],
    pastAntibiotics: [],
  },

  // ── 8. Cellulitis — antibiotics INDICATED ────────────────────────────────
  {
    id: 'demo-8',
    _isDemo: true,
    name: 'David Lee',
    age: 45,
    gender: 'male',
    weight: 88,
    scenario: 'Cellulitis — expanding erythema, left lower leg',
    shouldGetAntibiotics: true,
    demographics: { birthDate: '1980-08-10', address: '444 Willow Way, San Diego, CA' },
    conditions: [
      { code: 'L03.115', display: 'Cellulitis of left lower limb', onset: '2026-04-02' },
    ],
    observations: [
      { code: '8310-5',    display: 'Body temperature',          value: 38.4, unit: '°C',    date: '2026-04-04' },
      { code: '271811000', display: 'Erythema on left lower leg', value: 'expanding',         date: '2026-04-04' },
      { code: '271587008', display: 'Warmth and tenderness',      value: 'present',           date: '2026-04-04' },
      { code: '6690-2',    display: 'WBC count',                 value: 13.2, unit: '10^9/L', date: '2026-04-04' },
      { code: '1988-5',    display: 'C-reactive protein',        value: 89,   unit: 'mg/L',   date: '2026-04-04' },
      { code: '33959-9',   display: 'Procalcitonin',             value: 0.18, unit: 'ng/mL',  date: '2026-04-04' },
    ],
    allergies: [],
    currentMedications: ['Lisinopril 5 mg daily'],
    currentMedicationDrugs: [{ drug: 'lisinopril', name: 'Lisinopril 5 mg daily' }],
    pastAntibiotics: [],
  },

  // ── 9. Viral URI / Common Cold — antibiotics NOT indicated ────────────────
  {
    id: 'demo-9',
    _isDemo: true,
    name: 'Michael Brown',
    age: 25,
    gender: 'male',
    weight: 80,
    scenario: 'Viral URI — antibiotics NOT recommended',
    shouldGetAntibiotics: false,
    demographics: { birthDate: '2000-02-28', address: '555 Cedar Ln, Austin, TX' },
    conditions: [
      { code: 'J06.9', display: 'Acute upper respiratory infection, unspecified', onset: '2026-03-30' },
    ],
    observations: [
      { code: '8310-5',   display: 'Body temperature',     value: 37.4, unit: '°C',    date: '2026-04-04' },
      { code: '33717-0',  display: 'Cough',                value: 'present',            date: '2026-04-04' },
      { code: 'duration', display: 'Duration of symptoms', value: '3 days',             date: '2026-04-04' },
      { code: '6690-2',   display: 'WBC count',            value: 6.5,  unit: '10^9/L', date: '2026-04-04' },
      { code: '1988-5',   display: 'C-reactive protein',   value: 11,   unit: 'mg/L',   date: '2026-04-04' },
      { code: '33959-9',  display: 'Procalcitonin',        value: 0.05, unit: 'ng/mL',  date: '2026-04-04' },
    ],
    allergies: [],
    currentMedications: [],
    currentMedicationDrugs: [],
    pastAntibiotics: [],
  },

  // ── 10. Strep Pharyngitis + Drug Interaction — antibiotics INDICATED ──────
  {
    id: 'demo-10',
    _isDemo: true,
    name: 'Lisa Garcia',
    age: 55,
    gender: 'female',
    weight: 68,
    scenario: 'Strep pharyngitis — warfarin interaction alert',
    shouldGetAntibiotics: true,
    centorScore: 4,
    demographics: { birthDate: '1970-09-14', address: '888 Maple Dr, Chicago, IL' },
    conditions: [
      { code: 'J02.0', display: 'Streptococcal pharyngitis', onset: '2026-04-02' },
      { code: 'I48.91', display: 'Atrial fibrillation, unspecified', onset: '2020-03-01' },
    ],
    observations: [
      { code: '8310-5',    display: 'Body temperature',                       value: 38.5, unit: '°C',    date: '2026-04-04' },
      { code: '33717-0',   display: 'Cough',                                  value: 'absent',            date: '2026-04-04' },
      { code: '664-3',     display: 'Tonsillar swelling/exudate',              value: 'present',           date: '2026-04-04' },
      { code: 'LA16480-2', display: 'Tender anterior cervical lymphadenopathy',value: 'present',           date: '2026-04-04' },
      { code: '6690-2',    display: 'WBC count',                              value: 12.5, unit: '10^9/L', date: '2026-04-04' },
      { code: '1988-5',    display: 'C-reactive protein',                     value: 52,   unit: 'mg/L',   date: '2026-04-04' },
    ],
    allergies: [],
    currentMedications: ['Warfarin 5 mg daily (AFib)', 'Lisinopril 10 mg daily'],
    currentMedicationDrugs: [
      { drug: 'warfarin',   name: 'Warfarin 5 mg daily (AFib)' },
      { drug: 'lisinopril', name: 'Lisinopril 10 mg daily' },
    ],
    pastAntibiotics: [],
  },
];

export default patients;
