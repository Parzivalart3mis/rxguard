# RxGuard — Clinical Decision Support for Safer Antibiotic Prescribing

RxGuard is an evidence-based antibiotic stewardship tool designed for hospital prescribers. It combines validated clinical scoring algorithms, a facility-level antibiogram, real-time medication safety analysis, and AI-generated clinical reasoning to reduce inappropriate antibiotic use, prevent medication harm, and support safe discharge — all at the point of care.

The core problem it addresses: antibiotic overuse and inappropriate prescribing account for up to 50% of all antibiotic use in US hospitals [1], drive antimicrobial resistance, and cause preventable adverse drug events at discharge [2]. Existing tools either require expensive EHR integration or provide generic guidance that ignores local resistance patterns and individual patient risk factors. RxGuard integrates facility antibiogram data, patient-specific lab values and medications, and pathogen epidemiology to deliver prescribing guidance that is simultaneously evidence-based, locally calibrated, and patient-specific.

> **Disclaimer:** RxGuard is for educational and demonstration purposes only. All patient data is synthetic. It does not replace clinical judgment and must not be used in actual clinical care.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6 |
| Styling | Tailwind CSS 3.4 |
| Charts | Recharts |
| Icons | Lucide React |
| AI | Groq API (`llama-3.1-8b-instant`) |
| Backend | Express.js 4 |
| Database | SQLite (`better-sqlite3`) |
| FHIR | `fhirclient` 2.6 |
| Drug Standards | RxNorm CUIs, OpenFDA, LOINC |

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

RxGuard has three main tabs: **Dashboard**, **Prescribe**, and **Discharge**.

---

### Tab 1 — Dashboard

The landing page. Provides antibiotic stewardship analytics at a glance.

---

#### Feature 1 — Prescribing Dashboard

Monitors prescribing behaviour and stewardship metrics across the department using stored prescribing history:

- **Hero banner** — 30-day summary with total prescriptions, narrow-spectrum %, broad-spectrum %, and guideline adherence rate
- **Spectrum distribution pie chart** — proportion of narrow vs. medium vs. broad-spectrum prescriptions
- **Top 5 antibiotics bar chart** — prescription frequency by drug
- **6-month trend line chart** — adherence rate and narrow-spectrum % over time
- **Viral prescribing alert** — flags if antibiotics were prescribed for likely viral presentations
- **Quick patient selector** — launch directly to prescribing for a specific patient

The IDSA recommends tracking guideline concordance and broad-spectrum use as core antibiotic stewardship metrics [3].

---

### Tab 2 — Prescribe

The primary workflow for antibiotic selection.

---

#### Feature 2 — Patient Selector

Provides 11 synthetic patient cases across a range of clinical scenarios. When the backend is enabled, the selector also shows live **FHIR patients** fetched from the configured FHIR R4 server, listed in a separate optgroup.

| Patient | Scenario |
|---|---|
| Emma Thompson | Strep pharyngitis — high Centor score (4/5) |
| John Miller | Viral pharyngitis (no antibiotics needed) |
| Sarah Chen | Uncomplicated UTI |
| Robert Johnson | Community-acquired pneumonia with Atorvastatin |
| Emily Davis | Acute otitis media (pediatric) |
| Michael Brown | Viral URI (no antibiotics needed) |
| Lisa Garcia | Strep pharyngitis — Centor score 4, on Warfarin |
| James Wilson | Complicated UTI with comorbidities, on Glipizide |
| Anna Kowalski | Viral sinusitis — early stage |
| David Lee | Cellulitis |
| Maria Santos | Possible bacterial sinusitis — biphasic illness |

---

#### Feature 3 — Patient Context Card

Displays structured clinical data for the selected patient:

- Demographics (age, sex, weight)
- Active conditions with ICD-10 codes
- Lab results and vital sign observations (flagged if abnormal)
- Documented drug allergies with criticality badges
- Current medications
- Recent antibiotic history (last 90 days)

When a patient is loaded from the FHIR server, the card pulls live data from FHIR R4 resources (Patient, Condition, Observation, AllergyIntolerance, MedicationRequest) via the FHIR mapper service. Observations are indexed by both display name and LOINC code [4] so the scoring engine works identically for synthetic and real FHIR data.

---

#### Feature 4 — Bacterial Probability Gauge

Calculates the probability that the current presentation is bacterial (rather than viral) using validated clinical scoring algorithms. The appropriate algorithm is selected automatically based on the patient's active conditions.

| Algorithm | Conditions Covered | Key Inputs |
|---|---|---|
| **Modified Centor Score** [5] | Strep pharyngitis, viral pharyngitis | Fever >38°C, absence of cough, tonsillar swelling, cervical lymphadenopathy, age (3–14 +1, ≥45 −1) |
| **UTI Algorithm** | Uncomplicated UTI, complicated UTI | Dysuria + frequency, urinalysis (nitrites, leukocyte esterase), urine culture CFU/mL |
| **Sinusitis Algorithm** [6] | Acute bacterial vs. viral sinusitis | Symptom duration, biphasic illness pattern, fever, CRP, procalcitonin |
| **Pneumonia Scoring** | Community-acquired pneumonia | Consolidation on imaging, WBC, temperature, productive cough, CRP, procalcitonin |
| **Skin Infection Assessment** | Cellulitis | Expanding erythema, warmth/tenderness, fever, abscess formation, CRP |
| **URI Algorithm** | Viral upper respiratory infection | Symptom duration, fever, procalcitonin (<0.25 ng/mL caps at 20% bacterial) |
| **General Infection Score** | Otitis media, bronchitis, other infections | Fever, WBC, CRP, procalcitonin |

The gauge displays a percentage probability, the scoring method used, and the specific clinical indicators that contributed to the score. Each indicator includes the actual lab value or finding (e.g., "Procalcitonin 0.08 ng/mL — suggests viral aetiology").

**Procalcitonin thresholds** follow guidance from Schuetz et al. [7]: PCT <0.25 ng/mL supports antibiotic withholding; PCT >0.5 ng/mL supports bacterial infection. These cutoffs are embedded in the URI and general infection scorers.

**AI explanation (Groq):** After calculating the score, the system calls `llama-3.1-8b-instant` to generate a 2–3 sentence clinical narrative explaining why that probability was assigned, citing specific lab values and findings from the patient record. Falls back to a rule-based explanation if no API key is configured.

---

#### Feature 5 — Viral / No Antibiotic Banner

When the scoring algorithms determine a presentation is viral, a prominent blue banner is shown before the antibiotic selector:

> "Antibiotic not recommended — [Condition] is likely viral. Supportive care is advised."

This fires for viral URI (John Miller, Michael Brown), early viral sinusitis (Anna Kowalski), and other non-bacterial presentations.

---

#### Feature 6 — Antibiotic Recommender

The core prescribing decision-support engine.

**Recommendation algorithm**

Antibiotics are ranked using a composite scoring formula:

```
score = (spectrumRank × 10) − 15 (first-line bonus) + allergyPenalty + recentUsePenalty + (resistanceRate × 0.5)
```

Lower scores are preferred. The antibiotic with the lowest score is the recommended first-line option. This scoring structure operationalises the IDSA stewardship principle of prescribing the narrowest-spectrum effective agent [3].

**Weighted pathogen prevalence**

When a condition can be caused by multiple pathogens (e.g., community-acquired pneumonia, complicated UTI), susceptibility is computed as a weighted average:

```
susceptibility = Σ(pathogen.weight × local_susceptibility%) / Σ(pathogen.weight)
```

Pathogen prevalence weights are sourced from CDC/NHSN epidemiologic data [8] and IDSA guidelines [3,9]. For example, uncomplicated UTI weights *E. coli* at 85% prevalence [10]. The per-pathogen breakdown is shown inline with susceptibility % and resistance trend arrows (↑ / →).

**Status banner**
- Green check — "This is the recommended first-line option"
- Amber warning — "A better alternative may be available — Consider [X] instead"

**Drug details panel**
- Recommended dose
- Spectrum (narrow / medium / broad / very broad) with colour coding
- Local susceptibility % from the facility antibiogram (e.g., "E. coli susceptibility: 97%")
- Treatment duration

**Allergy safety check**

Cross-checks the selected antibiotic against documented allergies and known cross-reactivity patterns (e.g., penicillin allergy → warns for amoxicillin, amoxicillin-clavulanate, piperacillin-tazobactam). Cross-reactivity groups are stored per drug in the drug registry and follow AAAAI/ACAAI guidelines on beta-lactam allergy [11]. The prescribe button is disabled if an active allergy conflict is detected.

**Recent antibiotic use warning**

Flags if the same drug or drug class was used within the past 90 days, with the days-since-last-use count. This reflects IDSA guidance that recent fluoroquinolone or TMP-SMX use within 3 months is a risk factor for resistance [9].

**Alternative options panel**

Collapsible list of other viable antibiotics ranked by the same scoring algorithm, showing dose, spectrum, and local susceptibility.

**Action buttons**
- *Accept Recommendation* — records a guideline-concordant prescription
- *Override & Prescribe Selected* — opens the Override Modal for documented justification

---

#### Feature 7 — Drug-Drug Interaction Checker (Prescribe Tab)

When an antibiotic is selected, the system cross-checks it against the patient's current medication list. Interactions are sourced from the SQLite database (seeded from the `drugInteractions.js` data file) and enriched at startup by syncing interaction data from the RxNav API [12].

Interactions are displayed inline with severity-coded panels:

- **Red panel (Major):** Requires attention before prescribing
- **Orange panel (Moderate):** Clinical caution advised

Each panel shows the effect, mechanism, and recommended clinical action.

**Antibiotic-relevant interaction pairs covered:**

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

**Test scenarios:**
- Select **Robert Johnson** → choose **Azithromycin** → Atorvastatin moderate interaction fires
- Select **Lisa Garcia** → choose **Azithromycin** → Warfarin moderate interaction fires
- Select **James Wilson** → choose **Ciprofloxacin** → Glipizide **major** interaction fires

---

#### Feature 8 — AI: Why This May Not Be Optimal

When the physician selects an antibiotic that is not the first-line recommendation, an amber panel appears with an AI-generated explanation of why the selected drug is suboptimal for this specific patient and condition.

The AI prompt is anchored to the patient's specific data — it focuses on the weaknesses of the selected drug (unnecessarily broad spectrum, high local resistance rates, allergy risk, recent use within 90 days) rather than simply promoting the alternative. Respectful tone ("Consider...") is explicitly specified in the prompt. Falls back to a deterministic rule-based explanation if no API key is configured.

---

#### Feature 9 — AI: Clinical Rationale

When the selected antibiotic matches the recommendation, a blue panel shows an AI-generated 2–3 sentence rationale explaining why this is the preferred choice, citing:

- Spectrum appropriateness for the likely pathogen
- Local susceptibility data from the facility antibiogram
- Patient-specific factors (allergies, renal function, age, comorbidities)

---

#### Feature 10 — Override Modal

When a physician prescribes a non-recommended antibiotic, the Override Modal captures documented justification before proceeding. This is required for antibiotic stewardship audit compliance [3].

- Pre-populated with the selected antibiotic and the recommended alternative
- Requires selection of an override reason:
  - Clinical judgment
  - Patient preference
  - Prior treatment failure
  - Culture result pending
  - Allergy to recommended agent
  - Drug interaction with current medications
  - Other
- Optional free-text notes
- Override is recorded and flagged in the stewardship dashboard

---

#### Feature 11 — Resistance Impact Card

Visualises the downstream stewardship implications of the current antibiotic choice.

- **Spectrum position bar** — a movable indicator shows where the selected drug sits on the narrow→very-broad spectrum. Antibiotic stewardship guidelines recommend preferring narrow-spectrum agents to reduce collateral resistance pressure [3].
- **5-year local resistance trend chart** — line chart of historical resistance rates for the relevant pathogen-antibiotic pair from the facility antibiogram (e.g., *ciprofloxacin_ecoli*, *azithromycin_spneumo*). Visualises whether local resistance is stable, rising, or falling.
- **Stewardship impact warning** — contextual messaging when broad-spectrum agents are selected, reflecting evidence that broad-spectrum use accelerates community resistance rates [13].

---

### Tab 3 — Discharge

A structured 4-step workflow that runs comprehensive medication safety checks before a patient leaves hospital and generates AI-powered discharge instructions.

---

#### Step 1 — Medication Review

Select a discharge patient to view their complete medication picture:

- **Medication Picture** — three-column layout showing CONTINUING medications (green border), NEW THIS STAY medications (blue border), and STOPPED medications (greyed out). Each medication card shows dose, frequency, reason, and any flagged safety warnings.
- **Patient Labs Card** — key lab values with colour-coded severity thresholds: eGFR (green >60, yellow 30–60, orange 15–30, red <15), creatinine, potassium (with hypo/hyperkalaemia warnings), WBC, haemoglobin, INR
- **Symptoms List** — active symptoms with onset dates and severity badges (severe=red, moderate=amber, mild=green)
- **Run Safety Check** button — triggers the full 6-check safety analysis engine

---

#### Step 2 — Safety Alert Panel

Runs 6 independent safety checks and displays prioritised alerts. Each alert can be individually resolved; discharge is blocked until all critical alerts are resolved.

| Check | What It Detects | Rationale |
|---|---|---|
| **ADE Detection** | Symptoms likely caused by a current medication (e.g., ACE inhibitor dry cough, statin myopathy, CCB ankle oedema) | ADEs account for ~700,000 ED visits per year in the US [2] |
| **Prescribing Cascade Detection** | When a side effect of one drug is treated by adding another drug unnecessarily | Prescribing cascades are a leading cause of polypharmacy and pill burden [14] |
| **Drug-Drug Interactions** | Harmful pairwise combinations across the full medication list (new and continuing) | Bidirectional checking of all pairs from a ~30-interaction database |
| **Drug Class Interactions** | Pattern-based risks: anticoagulant + antibiotic, NSAID + ACEI + diuretic (triple whammy), SSRI + NSAID GI bleed risk | Class-level signals not captured by pairwise lookup [15] |
| **Renal Dosing Checks** | Drugs requiring dose adjustment based on the patient's eGFR (e.g., metformin contraindicated if eGFR <30, nitrofurantoin if eGFR <45) | Renal dose errors are among the most common medication errors at discharge [16] |
| **AKI Risk Assessment** | Nephrotoxic drug combinations that increase acute kidney injury risk | Triple-whammy (NSAID + ACEI + diuretic) significantly increases AKI risk [15] |

Alerts are categorised as **Critical**, **Major**, **Moderate**, or **Minor**. Resolution options:
- **Acknowledge** — for informational or accepted risks
- **Switch Med** — for ADE, renal, or interaction alerts that suggest an alternative
- **Resolve** — for cascade alerts that have a documented resolution strategy

A resolution progress bar tracks % of alerts cleared.

**Prescribing Cascade Visualizer**

Clicking a cascade alert opens an interactive flow diagram showing the cascade chain — the original drug, the symptom it caused, the drug added to treat that symptom, the new problem that drug caused, and the recommended resolution pathway. Shows pill burden reduction if the cascade root is addressed (e.g., 3 medications → 1).

**6 cascade patterns covered:**

| Cascade | Severity | Pill Reduction |
|---|---|---|
| CCB → ankle oedema → furosemide → hypokalaemia → K+ supplement | Moderate | 3 → 1 |
| Statin → myalgia → NSAID → GI upset → PPI | Moderate | 3 → 1 |
| ACE inhibitor → dry cough → cough suppressant | Low | 2 → 1 |
| SSRI → insomnia → sleep aid | Moderate | 2 → 1 |
| NSAID → hypertension → CCB → oedema → diuretic | High | 3 → 0 |
| Cholinesterase inhibitor (donepezil) → **anticholinergic (oxybutynin) opposes it** | **Critical** | — |

The cholinesterase-inhibitor / anticholinergic cascade is recognised as a critical interaction in dementia patients [17] and is given Critical severity in the alert system.

**Proceed / Block panel:**
- Unresolved critical alerts → red blocked state, discharge cannot proceed
- Only major/moderate remaining → amber caution, option to continue with acknowledgement
- All resolved → green cleared state, "Generate Discharge Instructions" activates

---

#### Step 3 — AI Discharge Generation

Calls the Groq API (`llama-3.1-8b-instant`) in parallel with two prompts:

1. **Medication Instructions** — patient-friendly, 6th-grade reading-level instructions for each medication (name, dose, timing, what it treats, important warnings). The AI prompt is grounded: it is given only the structured database data (dose, frequency, indication, known side effects, renal warnings) and instructed to translate it into plain English — never to invent clinical advice.
2. **Follow-Up Actions** — specific post-discharge checkpoints: follow-up appointments, labs to schedule, symptom monitoring parameters.

A loading spinner with status message is shown while generation is in progress. Falls back to rule-based generation if the API key is absent or the call fails.

---

#### Step 4 — Discharge Summary

Displays the generated output in a printable-ready layout:

- AI-generated medication instructions (patient-friendly)
- AI-generated follow-up action plan
- **Watch Out Symptoms** — condition-specific warning signs, shown as individual cards with two tiers: "May happen" (common side effects with frequency %) and "Call doctor or go to ER if:" (rare but serious effects)

---

## AI Architecture

### Model and Hosting

All AI features use `llama-3.1-8b-instant` via the Groq inference API. Groq's LPU hardware provides low-latency responses suitable for point-of-care use [18]. When `VITE_USE_BACKEND=true`, all AI calls are proxied through the Express server (`POST /api/ai/groq`) so the API key is never exposed in the browser bundle.

### Grounded Generation

All five AI prompt functions use a **grounded generation** pattern: the LLM is given only structured data that already exists in the database or patient record and is asked to translate or explain it — never to generate independent clinical reasoning or recommendations.

```
Prompt structure: [Structured patient data block] + [Specific question anchored to that data]
```

This approach was chosen to reduce hallucination risk in clinical contexts. The model cannot recommend a drug, dose, or intervention that is not already present in the structured context it received [19].

Temperature is set to 0.3 across all calls for near-deterministic output. Max tokens is 200 per call.

### AI Features Summary

| Feature | Trigger | Prompt Anchored To | Output |
|---|---|---|---|
| Bacterial probability explanation | Patient selected, score calculated | Patient obs + scoring output | 2–3 sentence narrative citing specific values |
| Why not optimal | Non-recommended antibiotic selected | Selected drug assessment + patient data | Weaknesses of the selected drug for this patient |
| Clinical rationale | Recommended antibiotic selected | Recommendation assessment + patient data | Justification for first-line choice |
| Discharge medication instructions | Step 3 of discharge workflow | DB data (dose, frequency, side effects, renal flags) | Patient-friendly plain-English medication guide |
| Discharge follow-up plan | Step 3 of discharge workflow | Conditions, new medications, lab flags | Specific post-discharge action items |

### Rule-Based Fallbacks

Every AI call has a complete deterministic fallback implemented in the same function. The fallback generates a structured explanation from the scoring output or database data without an LLM. This means the application remains fully functional without a Groq API key.

---

## Data Flow

```
User selects patient
        │
        ▼
PatientSelector ──────────────────────────────┐
  [demo patients.js]   [FHIR R4 → fhirMapper] │
                                               │
        ▼                                      │
scoringEngine.js                               │
  buildObsMap() ← observations (LOINC + name) │
  determineCondition() ← ICD-10 codes          │
  calculateBacterialProbability()              │
        │                                      │
        ▼                                      │
  score, condition, indicators                 │
        │                                      │
        ├──→ BacterialProbabilityGauge         │
        │     └──→ claudeApi: generateClinicalExplanation()
        │                                      │
        ▼                                      │
recommendationEngine.js                        │
  guidelines.js ← typicalPathogens (weighted) │
  antibiogram.js ← local susceptibility %     │
  Σ(weight × susceptibility) per pathogen     │
  rankAlternatives() → scored antibiotic list │
        │                                      │
        ▼                                      │
AntibioticRecommender                         │
  checkAllergies() → allergy warnings         │
  checkRecentAntibiotic() → 90-day flag       │
  checkDrugInteractions() → DDI alerts        │
  ResistanceCostVisualizer → trend chart      │
        │                                      │
        ├──→ [Recommended] claudeApi: generateRecommendationRationale()
        └──→ [Suboptimal] claudeApi: generateSuboptimalReasoning()
                                               │
        ▼                                      │
Override Modal (if applicable)                 │
  override reason → stewardship log           │
                                               │
───────────── Discharge Tab ──────────────────┘
        │
        ▼
DischargeWorkflow
  Step 1: MedicationPicture + PatientLabsCard + SymptomsList
        │
        ▼
  Step 2: safetyEngine.runSafetyChecks()
    ├── adeDetectionEngine.detectADEs()
    │     FREQUENCY_SCORES + ONSET_WINDOWS → ADE probability score
    ├── cascadeDetector.detectCascades()
    │     normalizeDrugClass() → matchesDrugClass() → cascade chain matching
    ├── interactionChecker.checkAllInteractions()
    │     pairwise (new + continuing meds) → severity sort
    ├── interactionChecker.checkClassInteractions()
    │     NSAID+ACEI+diuretic, warfarin+antibiotic, SSRI+NSAID
    └── renalDosingChecker.checkRenalDosing()
          eGFR → threshold lookup → dose action
        │
        ▼
  SafetyAlertPanel (resolve alerts)
  CascadeFlowDiagram (cascade visualisation)
        │
        ▼
  Step 3: dischargeGenerator.js
    buildMedDataBlock() → structured med context
    generateMedicationInstructions() → Groq API (grounded)
    generateFollowUpActions() → Groq API (grounded)
        │
        ▼
  Step 4: DischargeSummary
    AI instructions + follow-up + WatchOutSymptomCard
```

---

## Drug Interaction Data Sources

Interaction data comes from two sources:

1. **Static seed data** (`drugInteractions.js`) — ~30 curated antibiotic-relevant pairs with severity, mechanism, and clinical action, seeded into SQLite at startup.
2. **RxNav API sync** [12] — at backend startup, the `interactionFetcher.js` service queries the RxNav drug interaction API for each drug in the registry and caches any new interaction pairs not already in the database. Drug CUIs are maintained in the drug registry using RxNorm identifiers [20].

The `sync-rxnorm-cuis.js` script (run via `npm run sync:rxnorm`) maps internal drug keys to RxNorm CUIs via the OpenFDA API [21] for use in RxNav queries.

---

## FHIR R4 Integration

When `VITE_USE_BACKEND=true`, the backend exposes a FHIR proxy that pulls real patient data from any FHIR R4 server and maps it into RxGuard's internal schema.

### How it works

1. The Express server fetches FHIR resources from `FHIR_BASE_URL` (default: public HAPI/Synthea sandbox).
2. `fhirMapper.js` normalises raw FHIR bundles:
   - Maps SNOMED CT condition codes to ICD-10 for the scoring engine
   - Extracts LOINC-coded observations (WBC, CRP, procalcitonin, eGFR, …) [4]
   - Normalises antibiotic history from `MedicationRequest` resources
3. Mapped patients appear alongside synthetic cases in the Patient Selector.
4. The `usePatients` hook loads demo patients immediately, then appends FHIR patients asynchronously.

### FHIR Resources fetched

| Resource | Used for |
|---|---|
| `Patient` | Demographics (name, birth date, gender) |
| `Condition` | Active diagnoses mapped to ICD-10 |
| `Observation` | Labs and vitals with LOINC codes |
| `AllergyIntolerance` | Documented allergies and criticality |
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

| Route | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/safety/check` | POST | Run all 6 discharge safety checks for a patient |
| `/api/interactions` | GET / POST | Query the drug-interaction database |
| `/api/renalDosing` | GET / POST | Renal dosing alert lookup by drug + eGFR |
| `/api/ai/groq` | POST | Server-side Groq proxy (API key stays server-side) |
| `/api/drugs` | GET | Drug registry — list or search by name |
| `/api/recommendations` | POST | Antibiotic recommendation for a patient + condition |
| `/api/antibiogram` | GET | Facility resistance rates |
| `/api/fhir/*` | GET | FHIR patient integration (see above) |

**Startup tasks:** On boot, the server runs a database migration to upgrade any `typical_pathogens` values stored as flat string arrays to weighted objects (e.g., `["E. coli"]` → `[{ pathogen: "E. coli", weight: 0.85 }]`). It also queues background warmups to sync drug interaction data from RxNav and fetch OpenFDA side effects for any drugs missing cached data.

---

## Database

RxGuard uses a local SQLite file (`rxguard.db`) via `better-sqlite3` with WAL journal mode and foreign key enforcement.

| Table | Contents |
|---|---|
| `drugs` | Drug registry with RxNorm CUI, spectrum, dosing, cross-reactivity groups |
| `drug_interactions` | ~40 documented interaction pairs with severity and mechanism |
| `renal_dosing_rules` | Per-drug dose adjustments by eGFR threshold |
| `drug_side_effects` | Symptom profiles used by the ADE detection engine |
| `cascade_patterns` | Known prescribing cascade chains |
| `guidelines` | First-line treatment guidelines per condition with weighted pathogen prevalence |
| `antibiogram_data` | Facility-level resistance rates (pathogen × drug) |
| `antibiogram_history` | Year-over-year resistance trend data (5 years) |
| `ingestion_log` | Audit trail for data sync jobs |

### Data seeding and maintenance

```bash
# Load seed data into the database
npm run seed

# Verify seed data integrity
npm run verify

# Sync drug metadata from the RxNorm / OpenFDA API
npm run sync:rxnorm
```

---

## Project Structure

```
rxguard/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx                     # Header with active patient chip and theme toggle
│   │   ├── Sidebar.jsx                    # Tab navigation with active patient context
│   │   ├── PageHeader.jsx                 # Reusable section header
│   │   ├── PatientSelector.jsx            # Patient dropdown (synthetic + FHIR)
│   │   ├── PatientContextCard.jsx         # Demographics, labs, allergies, meds
│   │   ├── BacterialProbabilityGauge.jsx  # Scoring gauge + AI explanation
│   │   ├── AntibioticRecommender.jsx      # Antibiotic selection, interactions, AI panels
│   │   ├── ResistanceCostVisualizer.jsx   # Resistance impact card: spectrum bar + trend chart
│   │   ├── OverrideModal.jsx              # Override justification modal
│   │   ├── PrescribingDashboard.jsx       # Analytics and stewardship metrics
│   │   ├── DischargeWorkflow.jsx          # 4-step discharge workflow
│   │   ├── SafetyAlertPanel.jsx           # Consolidated alert dashboard with resolution
│   │   ├── CascadeFlowDiagram.jsx         # Prescribing cascade flow visualiser
│   │   ├── MedicationPicture.jsx          # 3-column: continuing / new / stopped
│   │   ├── PatientLabsCard.jsx            # Lab values with eGFR colour coding
│   │   ├── SymptomsList.jsx               # Symptoms with severity badges
│   │   ├── StepIndicator.jsx              # Workflow step progress
│   │   └── WatchOutSymptomCard.jsx        # Discharge warning sign cards
│   │
│   ├── services/
│   │   ├── scoringEngine.js               # Centor, UTI, URI, pneumonia, sinusitis, skin algorithms
│   │   ├── recommendationEngine.js        # Antibiotic ranking with weighted pathogen prevalence
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
│       ├── antibiogram.js                 # Local resistance data + 5-year trends
│       ├── guidelines.js                  # Treatment guidelines with weighted pathogen prevalence
│       ├── drugInteractions.js            # Drug-drug interaction database
│       ├── drugSideEffects.js             # Side effect profiles with frequency, onset windows
│       ├── cascadePatterns.js             # 6 prescribing cascade patterns
│       ├── renalDosingRules.js            # eGFR-based dose adjustment rules
│       └── prescribingHistory.js          # Historical data for the dashboard
│
├── server/
│   ├── index.js                           # Express server (port 3001), startup migration
│   ├── routes/
│   │   ├── safety.js                      # POST /api/safety/check
│   │   ├── interactions.js                # GET/POST /api/interactions
│   │   ├── renalDosing.js                 # GET/POST /api/renalDosing
│   │   ├── ai.js                          # POST /api/ai/groq (server-side key proxy)
│   │   ├── drugs.js                       # GET /api/drugs
│   │   ├── recommendations.js             # POST /api/recommendations
│   │   ├── antibiogram.js                 # GET /api/antibiogram
│   │   └── fhir.js                        # GET /api/fhir/* (FHIR R4 proxy)
│   ├── services/
│   │   ├── recommendationEngine.js        # Server-side weighted recommendation engine
│   │   ├── safetyEngine.js                # Server-side safety check orchestrator
│   │   ├── adeDetectionEngine.js          # Server-side ADE detection
│   │   ├── cascadeDetector.js             # Server-side cascade detection
│   │   ├── interactionChecker.js          # Server-side interaction checker
│   │   ├── renalDosingChecker.js          # Server-side renal checker
│   │   ├── fhirFetcher.js                 # Fetches FHIR R4 resources
│   │   ├── fhirMapper.js                  # Maps FHIR bundles → RxGuard schema
│   │   ├── interactionFetcher.js          # Background sync from RxNav API
│   │   └── sideEffectsFetcher.js          # Background sync from OpenFDA API
│   ├── middleware/
│   │   └── errorHandler.js                # Centralised error handling
│   └── db/
│       ├── schema.sql                     # SQLite table definitions
│       └── client.js                      # better-sqlite3 connection (WAL mode)
│
└── scripts/
    ├── seed/seed-from-js.js               # Loads all JS data files into SQLite
    ├── ingest/sync-rxnorm-cuis.js         # Maps drugs to RxNorm CUIs via OpenFDA
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
| `npm run sync:rxnorm` | Sync RxNorm drug metadata via OpenFDA |

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

- All the demo patient data is synthetic and fabricated for demonstration
- The antibiogram reflects a fictional hospital facility
- Clinical scoring algorithms are simplified implementations of validated tools (Centor, PSI-lite) — not certified for clinical use
- AI explanations are generated by a general-purpose LLM and have not been validated against clinical guidelines
- FHIR integration is read-only — no write-back to EHR systems
- No user authentication or role-based access control
- SQLite database is local-only and not persisted across deployments

---

## References

[1] Centers for Disease Control and Prevention. *Antibiotic Use in the United States, 2022 Update: Progress and Opportunities*. Atlanta, GA: US Department of Health and Human Services, CDC; 2022. https://www.cdc.gov/antibiotic-use/stewardship-report/index.html

[2] Budnitz DS, Pollock DA, Weidenbach KN, et al. National surveillance of emergency department visits for outpatient adverse drug events. *JAMA*. 2006;296(15):1858–1866. https://doi.org/10.1001/jama.296.15.1858

[3] Barlam TF, Cosgrove SE, Abbo LM, et al. Implementing an Antibiotic Stewardship Program: Guidelines by the Infectious Diseases Society of America and the Society for Healthcare Epidemiology of America. *Clin Infect Dis*. 2016;62(10):e51–e77. https://doi.org/10.1093/cid/ciw118

[4] Logical Observation Identifiers Names and Codes (LOINC). Regenstrief Institute. https://loinc.org/

[5] McIsaac WJ, Goel V, To T, Low DE. The validity of a sore throat score in family practice. *CMAJ*. 2000;163(7):811–815. https://www.cmaj.ca/content/163/7/811

[6] Chow AW, Benninger MS, Brook I, et al. IDSA Clinical Practice Guideline for Acute Bacterial Rhinosinusitis in Children and Adults. *Clin Infect Dis*. 2012;54(8):e72–e112. https://doi.org/10.1093/cid/cir1043

[7] Schuetz P, Wirz Y, Sager R, et al. Effect of procalcitonin-guided antibiotic treatment on mortality in acute respiratory infections: a patient level meta-analysis. *Lancet Infect Dis*. 2018;18(1):95–107. https://doi.org/10.1016/S1473-3099(17)30592-3

[8] Centers for Disease Control and Prevention. *National Healthcare Safety Network (NHSN) Antimicrobial Use and Resistance (AUR) Module*. https://www.cdc.gov/nhsn/acute-care-hospital/aur/index.html

[9] Gupta K, Hooton TM, Naber KG, et al. International Clinical Practice Guidelines for the Treatment of Acute Uncomplicated Cystitis and Pyelonephritis in Women. *Clin Infect Dis*. 2011;52(5):e103–e120. https://doi.org/10.1093/cid/ciq257

[10] Hooton TM. Uncomplicated urinary tract infection. *N Engl J Med*. 2012;366(11):1028–1037. https://doi.org/10.1056/NEJMcp1104429

[11] Macy E, Romano A, Khan D. "Practical Management of Antibiotic Hypersensitivity in 2017." *J Allergy Clin Immunol Pract*. 2017;5(3):577–586. https://doi.org/10.1016/j.jaip.2017.02.021

[12] National Library of Medicine. *RxNav Drug Interaction API*. https://lhncbc.nlm.nih.gov/RxNav/APIs/InteractionAPIs.html

[13] Van Boeckel TP, Gandra S, Ashok A, et al. Global antibiotic consumption 2000 to 2010: an analysis of national pharmaceutical sales data. *Lancet Infect Dis*. 2014;14(8):742–750. https://doi.org/10.1016/S1473-3099(14)70780-7

[14] Rochon PA, Gurwitz JH. Optimising drug treatment for elderly people: the prescribing cascade. *BMJ*. 1997;315(7115):1096–1099. https://doi.org/10.1136/bmj.315.7115.1096

[15] Lapi F, Azoulay L, Yin H, et al. Concurrent use of diuretics, angiotensin converting enzyme inhibitors, and angiotensin receptor blockers with non-steroidal anti-inflammatory drugs and risk of acute kidney injury. *BMJ*. 2013;346:e8525. https://doi.org/10.1136/bmj.e8525

[16] Cooney D, Pascuzzi K. Polypharmacy in the elderly: focus on drug interactions and adherence in hypertension. *Clin Geriatr Med*. 2009;25(2):221–233. https://doi.org/10.1016/j.cger.2009.01.005

[17] Fox C, Richardson K, Maidment ID, et al. Anticholinergic medication use and cognitive impairment in the older population: the Medical Research Council Cognitive Function and Ageing Study. *J Am Geriatr Soc*. 2011;59(8):1477–1483. https://doi.org/10.1111/j.1532-5415.2011.03491.x

[18] Groq Inc. *Groq LPU Inference Engine*. https://groq.com/

[19] Grunde-McLaughlin M, Heer J, Chang R. FLIRT: Feedback-Driven Iterative Refinement for Grounded Text Generation (2023). For a general discussion of grounded LLM generation to reduce hallucination. https://dl.acm.org/doi/10.1145/3544548.3580907

[20] Nelson SJ, Zeng K, Kilbourne J, et al. Normalized names for clinical drugs: RxNorm at 6 years. *J Am Med Inform Assoc*. 2011;18(4):441–448. https://doi.org/10.1136/amiajnl-2011-000116

[21] U.S. Food and Drug Administration. *OpenFDA API*. https://open.fda.gov/apis/
