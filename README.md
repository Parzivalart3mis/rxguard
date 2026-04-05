# RxGuard — Antibiotic Stewardship AI

RxGuard is a clinical decision-support tool that helps physicians make safer, evidence-based antibiotic prescribing decisions. It combines rule-based clinical scoring, a local antibiogram, and AI-generated reasoning to reduce inappropriate antibiotic use and prevent medication harm at the point of care and at discharge.

> **Disclaimer:** RxGuard is for educational and demonstration purposes only. All patient data is synthetic. It does not replace clinical judgment and must not be used in actual clinical care.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8 |
| Styling | Tailwind CSS 3.4 |
| Charts | Recharts |
| Icons | Lucide React |
| AI | Groq API (`llama-3.1-8b-instant`) |
| Backend | Express.js 4 |
| Database | SQLite (`better-sqlite3`) |
| FHIR | `fhirclient` 2.6 |

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `env.example` to `.env` and fill in the values:

```bash
cp env.example .env
```

```env
# Server-side Groq key (never exposed to the browser)
GROQ_API_KEY=your_groq_api_key_here

# Set to true to route AI/safety calls through the Express backend
VITE_USE_BACKEND=true

# FHIR server (defaults to public Synthea/HAPI sandbox)
FHIR_BASE_URL=https://hapi.fhir.org/baseR4
FHIR_AUTH_TOKEN=            # optional — required for Epic/Cerner sandboxes
FHIR_PATIENT_COUNT=20

# Set to true to display the FHIR data source badge in the UI
VITE_FHIR_SHOW_SOURCE=false
```

Get a free Groq API key at [console.groq.com/keys](https://console.groq.com/keys).

> The app works without a key — all AI features fall back to rule-based explanations automatically.

### 3. Seed the database

```bash
npm run seed
```

### 4. Run the development server

**Frontend only** (synthetic data, no backend required):

```bash
npm run dev
```

**Full stack** (backend + frontend, required for FHIR and server-side AI):

```bash
npm run dev:full
```

The Express API server starts on port 3001. The Vite dev server on port 5173 proxies `/api/*` to it automatically.

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Features

RxGuard has three main tabs: **Prescribe**, **Discharge**, and **Dashboard**.

---

### Tab 1 — Prescribe

The primary workflow for antibiotic selection. Select a patient to activate all features.

---

#### Feature 1 — Patient Selector

Provides 11 synthetic patient cases covering a range of clinical scenarios. When the backend is enabled, the selector also offers live **FHIR patients** fetched from the configured FHIR R4 server.

| Patient | Scenario |
|---|---|
| Emma Thompson | Strep pharyngitis — high Centor score (4/5) |
| John Miller | Viral pharyngitis (no antibiotics needed) |
| Sarah Chen | Uncomplicated UTI |
| Robert Johnson | Community-acquired pneumonia |
| Emily Davis | Acute otitis media (pediatric) |
| Michael Brown | Viral URI (no antibiotics needed) |
| Lisa Garcia | Strep pharyngitis — Centor score 4, on Warfarin |
| James Wilson | Complicated UTI with comorbidities, on Glipizide |
| Anna Kowalski | Viral sinusitis — early stage |
| David Lee | Cellulitis |
| Maria Santos | Possible bacterial sinusitis — biphasic illness |

---

#### Feature 2 — Patient Context Card

Displays structured clinical data for the selected patient including:

- Demographics (age, sex, weight)
- Active conditions with ICD codes
- Lab results and vital sign observations
- Documented drug allergies
- Current medications
- Recent antibiotic history

When a patient is loaded from the FHIR server, the card pulls live data from FHIR R4 resources (Patient, Condition, Observation, AllergyIntolerance, MedicationRequest).

---

#### Feature 3 — Bacterial Probability Gauge

Calculates the probability that the current presentation is bacterial (rather than viral) using validated clinical scoring algorithms:

| Algorithm | Conditions Covered |
|---|---|
| **Modified Centor Score** | Strep pharyngitis, viral pharyngitis |
| **UTI Algorithm** | Uncomplicated UTI, complicated UTI |
| **URI Algorithm** | Viral upper respiratory infection |
| **Pneumonia Scoring** | Community-acquired pneumonia |
| **Sinusitis Algorithm** | Acute bacterial vs. viral sinusitis |
| **Cellulitis Assessment** | Skin and soft tissue infections |

The gauge displays a percentage probability, the scoring method used, and key contributing clinical indicators (e.g. fever, WBC, procalcitonin, Centor criteria). All algorithms support both LOINC-coded observations (FHIR data) and display-name matching (synthetic data).

**AI explanation (Groq):** After calculating the score, the system calls `llama-3.1-8b-instant` to generate a 2–3 sentence clinical narrative explaining why that probability was assigned, citing specific lab values and observations from the patient record. Falls back to a rule-based explanation if no API key is configured.

---

#### Feature 4 — Viral / No Antibiotic Banner

When the scoring algorithms determine a presentation is viral, a blue banner is shown before the antibiotic selector:

> "Antibiotic not recommended — [Condition] is likely viral. Supportive care is advised."

This covers viral URI (John Miller, Michael Brown), early viral sinusitis (Anna Kowalski), and other non-bacterial conditions.

---

#### Feature 5 — Antibiotic Recommender

The core prescribing decision-support engine. After selecting an antibiotic from the dropdown, the system:

**Computes a recommendation** using a multi-factor scoring algorithm:

```
score = (spectrumRank × 10) − 15 (first-line bonus) + resistancePenalty + allergyPenalty + recentUsePenalty
```

Lower scores are preferred. The antibiotic with the lowest score is the recommended first-line option.

**Displays a status banner:**
- Green check — "This is the recommended first-line option"
- Amber warning — "A better alternative may be available — Consider [X] instead"

**Shows drug details:**
- Recommended dose
- Spectrum (narrow / medium / broad) with color coding
- Local susceptibility % from the hospital antibiogram (e.g. "E. coli susceptibility: 97%")
- Treatment duration

**Allergy warnings:** Cross-checks the selected antibiotic against the patient's documented allergies and known cross-reactivity patterns (e.g. Penicillin allergy → warns for Amoxicillin, Amoxicillin-Clavulanate). Disables the prescribe button if an allergy conflict exists.

**Recent antibiotic use warning:** Flags if the same drug or drug class was used within the past 90 days, with the number of days since last use.

**Alternative options panel:** Collapsible list of other viable antibiotics ranked by the same scoring algorithm, showing dose, spectrum, and local susceptibility.

**Action buttons:**
- *Accept Recommendation* — records a guideline-concordant prescription
- *Override & Prescribe Selected* — opens the Override Modal for documented justification

---

#### Feature 6 — AI: Why This May Not Be Optimal

When the physician selects an antibiotic that is not the first-line recommendation, an amber panel appears below the status banner with an AI-generated explanation of why the selected drug is suboptimal for this specific patient and condition.

The AI prompt focuses on the **weaknesses of the selected drug** — unnecessarily broad spectrum, high local resistance rates, allergy risk, recent use — rather than simply promoting the alternative. Falls back to a rule-based explanation if no API key is configured.

---

#### Feature 7 — AI: Clinical Rationale

When the selected antibiotic matches the recommendation, a blue panel shows an AI-generated 2–3 sentence rationale explaining why this is the preferred choice, citing:

- Spectrum appropriateness for the likely pathogen
- Local resistance/susceptibility data
- Patient-specific factors (allergies, renal function, age)

---

#### Feature 8 — Drug-Drug Interaction Checker (Prescribe Tab)

When an antibiotic is selected, the system cross-checks it against the patient's structured current medication list. Interactions are displayed inline with severity-coded panels:

- **Red panel (Major):** Requires attention before prescribing (e.g. Ciprofloxacin + Glipizide → severe hypoglycemia risk)
- **Orange panel (Moderate):** Clinical caution advised (e.g. Azithromycin + Atorvastatin → myopathy risk)

Each panel shows the effect description and recommended clinical action.

**Interaction database covers (antibiotic-relevant pairs):**

| Drug A | Drug B | Severity | Clinical Concern |
|---|---|---|---|
| Azithromycin | Atorvastatin | Moderate | CYP3A4 inhibition → myopathy risk |
| Warfarin | Azithromycin | Moderate | Increased INR / bleeding risk |
| Warfarin | Amoxicillin | Moderate | Gut flora disruption → elevated INR |
| Warfarin | TMP-SMX | Major | Warfarin displacement → high bleeding risk |
| Warfarin | Ciprofloxacin | Moderate | CYP1A2 inhibition → elevated INR |
| Warfarin | Levofloxacin | Moderate | Reduced vitamin K synthesis |
| Warfarin | Doxycycline | Moderate | Gut flora → elevated INR |
| Ciprofloxacin | Metformin | Moderate | Unpredictable dysglycemia |
| Ciprofloxacin | Glipizide | **Major** | Sulfonylurea-amplified hypoglycemia |
| Atorvastatin | Clarithromycin | Major | CYP3A4 inhibition → rhabdomyolysis |

**Test scenarios to observe interaction warnings:**
- Select **Robert Johnson** → choose **Azithromycin** → Atorvastatin moderate interaction fires
- Select **Lisa Garcia** → choose **Azithromycin** → Warfarin moderate interaction fires
- Select **James Wilson** → choose **Ciprofloxacin** → Glipizide **major** interaction fires

---

#### Feature 9 — Override Modal

When a physician prescribes a non-recommended antibiotic, the Override Modal requires documented justification before proceeding:

- Pre-populated with the selected antibiotic and the recommended alternative
- Requires selection of an override reason (allergy, culture result, clinical judgment, formulary, etc.)
- Optional free-text notes
- Records the override with reason in the notification banner

---

#### Feature 10 — Resistance Cost Visualizer

A chart-based panel that visualises the downstream resistance implications of different antibiotic choices. Displays historical and projected local resistance trends for the relevant pathogen-antibiotic pair from the hospital antibiogram.

---

### Tab 2 — Discharge

A structured 4-step workflow that runs comprehensive medication safety checks before a patient leaves the hospital and generates AI-powered discharge instructions.

---

#### Step 1 — Medication Review

Select a discharge patient to view their complete medication picture:

- **Medication Picture** — visual summary of continuing, new, and stopped medications
- **Patient Labs Card** — key lab values including eGFR, creatinine, potassium, WBC
- **Symptoms List** — active symptoms with onset and severity
- **Run Safety Check** button — triggers the full safety analysis engine

---

#### Step 2 — Safety Alert Panel

Runs 6 independent safety checks via the Safety Engine and displays prioritised alerts:

| Check | What It Detects |
|---|---|
| **ADE Detection** | Adverse drug events — symptoms likely caused by a current medication (e.g. ACE inhibitor cough, statin myopathy) |
| **Prescribing Cascade Detection** | When a side effect of one drug is being treated by adding another drug unnecessarily (e.g. NSAID → antacid) |
| **Drug-Drug Interactions** | Harmful combinations across the full medication list (new + continuing) |
| **Drug Class Interactions** | Pattern-based risks: anticoagulant + antibiotic, NSAID + ACEI + diuretic triple whammy, SSRI + NSAID GI bleeding |
| **Renal Dosing Checks** | Flags renally-cleared drugs that need dose adjustment based on eGFR (e.g. metformin hold if eGFR < 30) |
| **AKI Risk Assessment** | Identifies nephrotoxic drug combinations that increase acute kidney injury risk |

Alerts are categorised as **Critical**, **Major**, **Moderate**, or **Minor**. Each alert can be marked as resolved. Discharge is blocked until all critical alerts are resolved.

**Prescribing Cascade Visualizer:** Clicking a cascade alert opens an interactive flow diagram showing the cascade chain — the original symptom, the causative drug, the new symptom it caused, and the resolution pathway.

**Proceed / Block panel:**
- Unresolved critical alerts → red blocked state, discharge cannot proceed
- Only major/moderate remaining → amber caution, option to continue with acknowledgement
- All resolved → green cleared state, "Generate Discharge Instructions" activates

---

#### Step 3 — AI Discharge Generation

Calls the Groq API (`llama-3.1-8b-instant`) in parallel with two prompts:

1. **Medication Instructions** — patient-friendly plain-English instructions for each medication (name, dose, timing, what it treats, important warnings)
2. **Follow-Up Actions** — specific follow-up appointments, labs to schedule, monitoring parameters

A loading spinner with status message is shown while generation is in progress.

---

#### Step 4 — Discharge Summary

Displays the generated output in a printable-ready layout:

- AI-generated medication instructions
- AI-generated follow-up action plan
- **Watch Out Symptoms** — condition-specific warning signs to watch for at home, shown as individual cards (e.g. for a UTI patient: worsening pain, fever, blood in urine)

---

### Tab 3 — Dashboard

Prescribing analytics for antibiotic stewardship monitoring.

---

#### Feature 11 — Prescribing Dashboard

Visualises prescribing behaviour and stewardship metrics across the department:

- **Guideline concordance rate** — percentage of prescriptions that matched the first-line recommendation
- **Override rate** — percentage of prescriptions where the physician overrode the recommendation
- **Broad-spectrum usage** — proportion of broad-spectrum vs. narrow-spectrum prescriptions
- **Monthly trends** — line chart of prescribing volume and concordance over recent months
- **Per-antibiotic breakdown** — bar chart showing prescription frequency by drug
- **Override reasons** — distribution of documented reasons for non-concordant prescribing

---

## AI Features Summary

All AI features use `llama-3.1-8b-instant` via the Groq API. Every AI call has a graceful rule-based fallback if the API key is absent or the request fails. When `VITE_USE_BACKEND=true`, AI calls are proxied through the Express server so the key is never exposed in the browser bundle.

| Feature | Trigger | Model Output |
|---|---|---|
| Bacterial probability explanation | Patient selected, score calculated | 2–3 sentence clinical narrative citing specific data points |
| Why not optimal | Non-recommended antibiotic selected | Explanation of selected drug's weaknesses for this patient |
| Clinical rationale | Recommended antibiotic selected | Justification for why this is the preferred choice |
| Discharge medication instructions | Step 3 of discharge workflow | Patient-friendly plain-English medication guide |
| Discharge follow-up plan | Step 3 of discharge workflow | Specific follow-up actions and monitoring parameters |

---

## FHIR R4 Integration

When `VITE_USE_BACKEND=true`, the backend exposes a FHIR proxy that can pull real patient data from any FHIR R4 server and map it into RxGuard's internal schema.

### How it works

1. The Express server fetches FHIR resources from `FHIR_BASE_URL` (default: public HAPI/Synthea sandbox).
2. `fhirMapper.js` normalises the raw FHIR bundles:
   - Maps SNOMED CT codes to ICD-10 for the scoring engine
   - Extracts LOINC-coded observations (WBC, CRP, procalcitonin, eGFR, …)
   - Normalises antibiotic history from `MedicationRequest` resources
3. The mapped patients appear alongside the synthetic cases in the Patient Selector dropdown.

### FHIR Resources fetched

| Resource | Used for |
|---|---|
| `Patient` | Demographics (name, birth date, gender) |
| `Condition` | Active diagnoses mapped to ICD-10 |
| `Observation` | Labs and vitals with LOINC codes |
| `AllergyIntolerance` | Documented allergies + criticality |
| `MedicationRequest` | Active and historical medications |

### FHIR API endpoints (backend)

| Endpoint | Description |
|---|---|
| `GET /api/fhir/status` | Health check — confirms FHIR server reachability |
| `GET /api/fhir/patients` | Returns a list of available FHIR patients |
| `GET /api/fhir/patients/:id` | Returns full mapped patient data for one patient |

### Connecting to Epic / Cerner sandboxes

Set `FHIR_BASE_URL` to the sandbox base URL and provide a bearer token in `FHIR_AUTH_TOKEN`. The backend attaches the token to all outbound FHIR requests.

---

## Backend API

The Express server (`server/index.js`) runs on port 3001 and is proxied by Vite during development.

| Route prefix | Purpose |
|---|---|
| `POST /api/safety/check` | Run all 6 discharge safety checks for a patient |
| `GET/POST /api/interactions` | Query the drug-interaction database |
| `GET/POST /api/renalDosing` | Renal dosing alert lookup |
| `POST /api/ai/groq` | Server-side Groq proxy (keeps API key out of browser) |
| `GET /api/drugs` | Drug registry — list or search by name |
| `POST /api/recommendations` | Antibiotic recommendation for a patient + condition |
| `GET /api/antibiogram` | Facility resistance rates |
| `GET /api/fhir/*` | FHIR patient integration (see above) |

---

## Database

RxGuard uses a local SQLite file (`rxguard.db`) via `better-sqlite3`.

| Table | Contents |
|---|---|
| `drugs` | Drug registry with RxNorm CUI, spectrum, dosing, cross-reactivity groups |
| `drug_interactions` | ~40 documented interaction pairs with severity and mechanism |
| `renal_dosing_rules` | Per-drug dose adjustments by eGFR threshold |
| `drug_side_effects` | Symptom profiles used by the ADE detection engine |
| `cascade_patterns` | Known prescribing cascade chains |
| `guidelines` | First-line treatment guidelines per condition |
| `antibiogram_data` | Facility-level resistance rates (pathogen × drug) |
| `antibiogram_history` | Year-over-year resistance trend data |
| `ingestion_log` | Audit trail for data sync jobs |

### Data seeding & maintenance

```bash
# Load seed data into the database
npm run seed

# Verify seed data integrity
npm run verify

# Sync drug metadata from the RxNorm API
npm run sync:rxnorm
```

---

## Project Structure

```
rxguard-master/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx                     # Navigation — Prescribe / Discharge / Dashboard
│   │   ├── PatientSelector.jsx            # Patient dropdown (synthetic + FHIR)
│   │   ├── PatientContextCard.jsx         # Demographics, labs, allergies, meds
│   │   ├── BacterialProbabilityGauge.jsx  # Scoring gauge + AI explanation
│   │   ├── AntibioticRecommender.jsx      # Antibiotic selection, interactions, AI panels
│   │   ├── ResistanceCostVisualizer.jsx   # Resistance trend charts
│   │   ├── OverrideModal.jsx              # Override justification modal
│   │   ├── PrescribingDashboard.jsx       # Analytics tab
│   │   ├── DischargeWorkflow.jsx          # 4-step discharge workflow
│   │   ├── SafetyAlertPanel.jsx           # Alert list with resolve actions
│   │   ├── CascadeFlowDiagram.jsx         # Prescribing cascade visualizer
│   │   ├── MedicationPicture.jsx          # Discharge medication summary
│   │   ├── PatientLabsCard.jsx            # Lab values display
│   │   ├── SymptomsList.jsx               # Symptoms list
│   │   ├── StepIndicator.jsx              # Step progress indicator
│   │   └── WatchOutSymptomCard.jsx        # Discharge warning signs
│   │
│   ├── services/
│   │   ├── scoringEngine.js               # Centor, UTI, URI, pneumonia, sinusitis algorithms
│   │   ├── recommendationEngine.js        # Antibiotic ranking + allergy/resistance checks
│   │   ├── claudeApi.js                   # Groq API calls + rule-based fallbacks
│   │   ├── safetyEngine.js                # Discharge safety check orchestrator
│   │   ├── adeDetectionEngine.js          # Adverse drug event detection
│   │   ├── cascadeDetector.js             # Prescribing cascade detection
│   │   ├── interactionChecker.js          # Drug-drug interaction checker
│   │   ├── renalDosingChecker.js          # Renal dose adjustment checker
│   │   └── dischargeGenerator.js          # Discharge instruction generation
│   │
│   └── data/
│       ├── patients.js                    # 11 synthetic prescribe-tab patient cases
│       ├── dischargePatients.js           # Discharge workflow patient scenarios
│       ├── antibiogram.js                 # Local resistance data + antibiotic metadata
│       ├── guidelines.js                  # Clinical treatment guidelines per condition
│       ├── drugInteractions.js            # Drug-drug interaction database
│       ├── drugSideEffects.js             # Side effect profiles for ADE detection
│       ├── cascadePatterns.js             # Known prescribing cascade patterns
│       ├── renalDosingRules.js            # eGFR-based dose adjustment rules
│       └── prescribingHistory.js          # Historical data for the dashboard
│
├── server/
│   ├── index.js                           # Express server entry point (port 3001)
│   ├── routes/
│   │   ├── safety.js                      # POST /api/safety/check
│   │   ├── interactions.js                # GET/POST /api/interactions
│   │   ├── renalDosing.js                 # GET/POST /api/renalDosing
│   │   ├── groq.js                        # POST /api/ai/groq (server-side key proxy)
│   │   ├── drugs.js                       # GET /api/drugs
│   │   ├── recommendations.js             # POST /api/recommendations
│   │   ├── antibiogram.js                 # GET /api/antibiogram
│   │   └── fhir.js                        # GET /api/fhir/* (FHIR R4 proxy)
│   ├── services/
│   │   ├── fhirFetcher.js                 # Fetches FHIR R4 resources
│   │   └── fhirMapper.js                  # Maps FHIR → RxGuard schema
│   ├── middleware/
│   │   └── errorHandler.js                # Centralised error handling
│   └── db/
│       ├── schema.sql                     # SQLite table definitions
│       └── client.js                      # better-sqlite3 connection
│
└── scripts/
    ├── seed/seed-from-js.js               # Loads data into SQLite
    ├── ingest/sync-rxnorm-cuis.js         # Syncs RxNorm drug metadata
    └── verify-seed.js                     # Validates seed data integrity
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server only (frontend, synthetic data) |
| `npm run server` | Start Express backend only |
| `npm run dev:full` | Start both frontend and backend in parallel |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run seed` | Seed the SQLite database |
| `npm run verify` | Verify seed data integrity |
| `npm run sync:rxnorm` | Sync RxNorm drug metadata |

---

## Linting

```bash
npm run lint
```

The project enforces zero ESLint warnings. Key rules enforced:

- `react-hooks/rules-of-hooks` — hooks only at top level
- `react-hooks/exhaustive-deps` — all `useEffect`/`useMemo` dependencies declared
- `no-unused-vars` — no dead imports or variables
- `no-case-declarations` — `switch` case blocks use braces

---

## Known Limitations

- All patient data is synthetic and fabricated for demonstration
- The antibiogram reflects a fictional hospital facility
- Clinical scoring algorithms are simplified implementations of validated tools (Centor, PSI-lite) — not certified for clinical use
- AI explanations are generated by a general-purpose LLM and have not been validated against clinical guidelines
- FHIR integration is read-only — no write-back to EHR systems
- No user authentication or role-based access control
- SQLite database is local-only and not persisted across deployments
