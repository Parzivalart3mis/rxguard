// 10 Synthetic FHIR Patient Bundles for RxGuard

export const patients = [
  {
    id: "1",
    name: "John Miller",
    age: 34,
    gender: "male",
    weight: 78,
    scenario: "Pharyngitis - viral",
    shouldGetAntibiotics: false,
    centorScore: 1,
    demographics: {
      birthDate: "1991-03-15",
      address: "123 Main St, Boston, MA"
    },
    conditions: [
      {
        code: "J02.9",
        display: "Acute pharyngitis, unspecified",
        onset: "2025-04-01"
      }
    ],
    observations: [
      { code: "8310-5", display: "Body temperature", value: 37.0, unit: "°C", date: "2025-04-04" },
      { code: "33717-0", display: "Cough", value: "present", date: "2025-04-04" },
      { code: "664-3", display: "Tonsillar exudate", value: "absent", date: "2025-04-04" },
      { code: "LA16480-2", display: "Tender cervical lymphadenopathy", value: "absent", date: "2025-04-04" },
      { code: "6690-2", display: "WBC count", value: 7.2, unit: "10^9/L", date: "2025-04-04" }
    ],
    allergies: [],
    currentMedications: [],
    pastAntibiotics: []
  },
  {
    id: "2",
    name: "Sarah Chen",
    age: 28,
    gender: "female",
    weight: 62,
    scenario: "UTI - uncomplicated",
    shouldGetAntibiotics: true,
    demographics: {
      birthDate: "1997-07-22",
      address: "456 Oak Ave, Seattle, WA"
    },
    conditions: [
      {
        code: "N30.0",
        display: "Acute cystitis",
        onset: "2025-04-03"
      }
    ],
    observations: [
      { code: "8310-5", display: "Body temperature", value: 37.2, unit: "°C", date: "2025-04-04" },
      { code: "33959-6", display: "Dysuria", value: "present", date: "2025-04-04" },
      { code: "198130006", display: "Urinary frequency", value: "present", date: "2025-04-04" },
      { code: "33905-1", display: "Vaginal discharge", value: "absent", date: "2025-04-04" },
      { code: "5802-4", display: "Nitrites in urine", value: "positive", date: "2025-04-04" },
      { code: "5797-6", display: "Leukocyte esterase", value: "positive", date: "2025-04-04" }
    ],
    allergies: [],
    currentMedications: ["Levonorgestrel 0.1mg/EE 20mcg (Oral contraceptive)"],
    pastAntibiotics: [
      { name: "Nitrofurantoin", date: "2024-08-15" }
    ]
  },
  {
    id: "3",
    name: "Robert Johnson",
    age: 67,
    gender: "male",
    weight: 82,
    scenario: "Community-acquired pneumonia",
    shouldGetAntibiotics: true,
    demographics: {
      birthDate: "1958-11-08",
      address: "789 Pine Rd, Denver, CO"
    },
    conditions: [
      {
        code: "J18.1",
        display: "Lobar pneumonia, unspecified",
        onset: "2025-04-02"
      }
    ],
    observations: [
      { code: "8310-5", display: "Body temperature", value: 38.7, unit: "°C", date: "2025-04-04" },
      { code: "33717-0", display: "Cough", value: "productive", date: "2025-04-04" },
      { code: "6690-2", display: "WBC count", value: 14.8, unit: "10^9/L", date: "2025-04-04" },
      { code: "1988-5", display: "C-reactive protein", value: 156, unit: "mg/L", date: "2025-04-04" },
      { code: "33959-9", display: "Procalcitonin", value: 0.8, unit: "ng/mL", date: "2025-04-04" },
      { code: "36728-3", display: "Chest X-ray consolidation", value: "right lower lobe", date: "2025-04-04" }
    ],
    allergies: [],
    currentMedications: ["Lisinopril 10mg daily", "Metformin 500mg BID", "Atorvastatin 20mg daily"],
    currentMedicationDrugs: [
      { drug: "lisinopril", name: "Lisinopril 10mg daily" },
      { drug: "metformin", name: "Metformin 500mg BID" },
      { drug: "atorvastatin", name: "Atorvastatin 20mg daily" }
    ],
    pastAntibiotics: []
  },
  {
    id: "4",
    name: "Emily Davis",
    age: 8,
    gender: "female",
    weight: 26,
    scenario: "Acute otitis media",
    shouldGetAntibiotics: true,
    demographics: {
      birthDate: "2017-05-12",
      address: "321 Elm St, Portland, OR"
    },
    conditions: [
      {
        code: "H66.0",
        display: "Acute otitis media",
        onset: "2025-04-03"
      }
    ],
    observations: [
      { code: "8310-5", display: "Body temperature", value: 39.0, unit: "°C", date: "2025-04-04" },
      { code: "LA18313-0", display: "Ear pain", value: "present", date: "2025-04-04" },
      { code: "LA18314-8", display: "Bulging tympanic membrane", value: "present", date: "2025-04-04" },
      { code: "6690-2", display: "WBC count", value: 11.2, unit: "10^9/L", date: "2025-04-04" }
    ],
    allergies: [],
    currentMedications: [],
    pastAntibiotics: []
  },
  {
    id: "5",
    name: "Michael Brown",
    age: 45,
    gender: "male",
    weight: 88,
    scenario: "Viral URI - should NOT get antibiotics",
    shouldGetAntibiotics: false,
    demographics: {
      birthDate: "1980-02-28",
      address: "555 Cedar Ln, Austin, TX"
    },
    conditions: [
      {
        code: "J06.9",
        display: "Acute upper respiratory infection, unspecified",
        onset: "2025-03-30"
      }
    ],
    observations: [
      { code: "8310-5", display: "Body temperature", value: 37.8, unit: "°C", date: "2025-04-04" },
      { code: "33717-0", display: "Cough", value: "present", date: "2025-04-04" },
      { code: "198130006", display: "Duration of symptoms", value: "5 days", date: "2025-04-04" },
      { code: "6690-2", display: "WBC count", value: 6.5, unit: "10^9/L", date: "2025-04-04" },
      { code: "1988-5", display: "C-reactive protein", value: 12, unit: "mg/L", date: "2025-04-04" },
      { code: "33959-9", display: "Procalcitonin", value: 0.05, unit: "ng/mL", date: "2025-04-04" }
    ],
    allergies: [],
    currentMedications: [],
    pastAntibiotics: []
  },
  {
    id: "6",
    name: "Lisa Garcia",
    age: 55,
    gender: "female",
    weight: 68,
    scenario: "Strep pharyngitis - high Centor",
    shouldGetAntibiotics: true,
    centorScore: 4,
    demographics: {
      birthDate: "1970-09-14",
      address: "888 Maple Dr, Chicago, IL"
    },
    conditions: [
      {
        code: "J02.0",
        display: "Streptococcal pharyngitis",
        onset: "2025-04-02"
      }
    ],
    observations: [
      { code: "8310-5", display: "Body temperature", value: 38.5, unit: "°C", date: "2025-04-04" },
      { code: "33717-0", display: "Cough", value: "absent", date: "2025-04-04" },
      { code: "664-3", display: "Tonsillar swelling/exudate", value: "present", date: "2025-04-04" },
      { code: "LA16480-2", display: "Tender anterior cervical lymphadenopathy", value: "present", date: "2025-04-04" },
      { code: "6690-2", display: "WBC count", value: 12.5, unit: "10^9/L", date: "2025-04-04" }
    ],
    allergies: [],
    currentMedications: ["Warfarin 5mg daily", "Lisinopril 10mg daily"],
    currentMedicationDrugs: [
      { drug: "warfarin", name: "Warfarin 5mg daily (AFib)" },
      { drug: "lisinopril", name: "Lisinopril 10mg daily" }
    ],
    pastAntibiotics: []
  },
  {
    id: "7",
    name: "James Wilson",
    age: 72,
    gender: "male",
    weight: 75,
    scenario: "Recurrent UTI with complicating factors",
    shouldGetAntibiotics: true,
    demographics: {
      birthDate: "1953-04-03",
      address: "999 Birch St, Miami, FL"
    },
    conditions: [
      {
        code: "N30.0",
        display: "Acute cystitis",
        onset: "2025-04-01"
      },
      {
        code: "E11.9",
        display: "Type 2 diabetes mellitus",
        onset: "2015-06-10"
      }
    ],
    observations: [
      { code: "8310-5", display: "Body temperature", value: 37.4, unit: "°C", date: "2025-04-04" },
      { code: "33959-6", display: "Dysuria", value: "present", date: "2025-04-04" },
      { code: "198130006", display: "Urinary frequency", value: "present", date: "2025-04-04" },
      { code: "5802-4", display: "Nitrites in urine", value: "positive", date: "2025-04-04" },
      { code: "33914-3", display: "Urine culture", value: "E. coli > 100,000 CFU/mL", date: "2025-04-04" },
      { code: "6690-2", display: "WBC count", value: 9.8, unit: "10^9/L", date: "2025-04-04" }
    ],
    allergies: [
      { substance: "Penicillin", criticality: "high", type: "allergy" }
    ],
    currentMedications: ["Metformin 1000mg BID", "Glipizide 5mg daily"],
    currentMedicationDrugs: [
      { drug: "metformin", name: "Metformin 1000mg BID" },
      { drug: "glipizide", name: "Glipizide 5mg daily" }
    ],
    pastAntibiotics: [
      { name: "TMP-SMX", date: "2025-02-20", reason: "Prior UTI" }
    ]
  },
  {
    id: "8",
    name: "Anna Kowalski",
    age: 40,
    gender: "female",
    weight: 65,
    scenario: "Viral sinusitis - early stage",
    shouldGetAntibiotics: false,
    demographics: {
      birthDate: "1985-12-20",
      address: "777 Spruce Ave, Phoenix, AZ"
    },
    conditions: [
      {
        code: "J01.90",
        display: "Acute sinusitis, unspecified",
        onset: "2025-03-31"
      }
    ],
    observations: [
      { code: "8310-5", display: "Body temperature", value: 36.9, unit: "°C", date: "2025-04-04" },
      { code: "271587009", display: "Facial pain/pressure", value: "present", date: "2025-04-04" },
      { code: "198130006", display: "Duration of symptoms", value: "4 days", date: "2025-04-04" },
      { code: "33959-6", display: "Nasal discharge", value: "clear", date: "2025-04-04" },
      { code: "6690-2", display: "WBC count", value: 6.8, unit: "10^9/L", date: "2025-04-04" }
    ],
    allergies: [],
    currentMedications: [],
    pastAntibiotics: []
  },
  {
    id: "9",
    name: "David Lee",
    age: 30,
    gender: "male",
    weight: 75,
    scenario: "Cellulitis - skin/soft tissue infection",
    shouldGetAntibiotics: true,
    demographics: {
      birthDate: "1995-08-10",
      address: "444 Willow Way, San Diego, CA"
    },
    conditions: [
      {
        code: "L03.90",
        display: "Cellulitis, unspecified",
        onset: "2025-04-02"
      }
    ],
    observations: [
      { code: "8310-5", display: "Body temperature", value: 38.2, unit: "°C", date: "2025-04-04" },
      { code: "271811000", display: "Erythema on left lower leg", value: "expanding", date: "2025-04-04" },
      { code: "271587008", display: "Warmth and tenderness", value: "present", date: "2025-04-04" },
      { code: "6690-2", display: "WBC count", value: 13.2, unit: "10^9/L", date: "2025-04-04" },
      { code: "1988-5", display: "C-reactive protein", value: 89, unit: "mg/L", date: "2025-04-04" }
    ],
    allergies: [],
    currentMedications: [],
    pastAntibiotics: []
  },
  {
    id: "10",
    name: "Maria Santos",
    age: 22,
    gender: "female",
    weight: 58,
    scenario: "Possible bacterial sinusitis - biphasic illness",
    shouldGetAntibiotics: "maybe",
    demographics: {
      birthDate: "2003-01-15",
      address: "333 Palm St, Orlando, FL"
    },
    conditions: [
      {
        code: "J01.00",
        display: "Acute maxillary sinusitis, unspecified",
        onset: "2025-03-21"
      }
    ],
    observations: [
      { code: "8310-5", display: "Body temperature", value: 37.6, unit: "°C", date: "2025-04-04" },
      { code: "198130006", display: "Duration of symptoms", value: "14 days", date: "2025-04-04" },
      { code: "271587009", display: "Facial pain", value: "present", date: "2025-04-04" },
      { code: "33959-6", display: "Nasal discharge", value: "purulent", date: "2025-04-04" },
      { code: "448651000", display: "Biphasic illness", value: "yes - worsened after initial improvement", date: "2025-04-04" },
      { code: "6690-2", display: "WBC count", value: 9.2, unit: "10^9/L", date: "2025-04-04" }
    ],
    allergies: [],
    currentMedications: [],
    pastAntibiotics: []
  }
];

export default patients;
