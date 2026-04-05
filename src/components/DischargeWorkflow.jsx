import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, AlertTriangle, CheckCircle, Loader2, ClipboardList, Zap, FileText, Users } from 'lucide-react';

import StepIndicator from './StepIndicator.jsx';
import MedicationPicture from './MedicationPicture.jsx';
import PatientLabsCard from './PatientLabsCard.jsx';
import SymptomsList from './SymptomsList.jsx';
import SafetyAlertPanel from './SafetyAlertPanel.jsx';
import CascadeFlowDiagram from './CascadeFlowDiagram.jsx';
import WatchOutSymptomCard from './WatchOutSymptomCard.jsx';

import { useDischargePatients } from '../hooks/useDischargePatients.js';
import { generateMedicationInstructions, generateFollowUpActions } from '../services/dischargeGenerator.js';

// Pure discharge-gate logic — no data imports needed
const canDischargeProceed = (safetyResult, resolvedAlertIds = []) => {
  const unresolvedCritical = safetyResult.alerts.critical.filter(
    (a) => !resolvedAlertIds.includes(a.title)
  );
  if (unresolvedCritical.length > 0) {
    return {
      canProceed: false,
      reason: `${unresolvedCritical.length} critical alert(s) must be resolved`,
      blockingAlerts: unresolvedCritical,
    };
  }
  const unresolvedMajor = safetyResult.alerts.major.filter(
    (a) => !resolvedAlertIds.includes(a.title)
  );
  if (unresolvedMajor.length > 0) {
    return {
      canProceed: true,
      warning: `${unresolvedMajor.length} major alert(s) should be reviewed`,
      pendingAlerts: unresolvedMajor,
    };
  }
  return { canProceed: true, warning: null };
};

// Extract drug names involved in any alert
const getFlaggedMeds = (safetyResult) => {
  if (!safetyResult) return [];
  const drugs = new Set();
  for (const alert of safetyResult.allAlerts) {
    if (alert.medications) alert.medications.forEach(m => drugs.add(m.drug));
    if (alert.details?.topMatch?.drug) drugs.add(alert.details.topMatch.drug);
    if (alert.details?.drug) drugs.add(alert.details.drug);
    if (alert.details?.drug1?.drug) drugs.add(alert.details.drug1.drug);
    if (alert.details?.drug2?.drug) drugs.add(alert.details.drug2.drug);
  }
  return [...drugs];
};

const SeverityBadge = ({ count, label, color }) => {
  if (!count) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${color}`}>
      {count} {label}
    </span>
  );
};

const DischargeWorkflow = ({ acceptedPrescriptions = {} }) => {
  const { patients: dischargePatientsAll, loading: patientsLoading, getDischargePatient } = useDischargePatients();

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [currentStep, setCurrentStep]   = useState(1);
  const [resolvedAlerts, setResolvedAlerts] = useState([]);
  const [generating, setGenerating]     = useState(false);
  const [dischargeOutput, setDischargeOutput] = useState(null);
  const [selectedCascade, setSelectedCascade] = useState(null);
  const [notification, setNotification] = useState(null);
  const [patient, setPatient]           = useState(null);
  const [patientLoading, setPatientLoading] = useState(false);

  const [safetyResult, setSafetyResult] = useState(null);
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [safetyError, setSafetyError] = useState(null);
  const [sideEffectsMap, setSideEffectsMap] = useState({});

  useEffect(() => {
    if (!patient) {
      setSafetyResult(null);
      setSafetyError(null);
      setSideEffectsMap({});
      return;
    }

    setSafetyLoading(true);
    setSafetyError(null);

    const allMedKeys = [
      ...patient.continuingMeds.map((m) => m.drug),
      ...patient.newMeds.map((m) => m.drug),
    ].join(',');

    Promise.all([
      fetch('/api/safety/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patient),
      }).then((r) => {
        if (!r.ok) throw new Error(`Safety check failed: ${r.status}`);
        return r.json();
      }),
      fetch(`/api/drugs/side-effects?keys=${encodeURIComponent(allMedKeys)}`).then((r) =>
        r.ok ? r.json() : {}
      ),
    ])
      .then(([safety, sideEffects]) => {
        setSafetyResult(safety);
        setSideEffectsMap(sideEffects);
        setSafetyLoading(false);
      })
      .catch((err) => {
        console.error('Safety check failed:', err);
        setSafetyError('Could not reach the backend. Make sure the server is running (npm run server).');
        setSafetyLoading(false);
      });
  }, [patient]);

  const flaggedMeds = useMemo(() => getFlaggedMeds(safetyResult), [safetyResult]);

  const cascadeAlerts = safetyResult?.allAlerts.filter(a => a.type === 'cascade') || [];

  const proceedCheck = safetyResult ? canDischargeProceed(safetyResult, resolvedAlerts) : null;

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const injectAcceptedPrescription = (resolvedPatient) => {
    if (!resolvedPatient) return resolvedPatient;
    const accepted = acceptedPrescriptions[resolvedPatient.name];
    if (!accepted) return resolvedPatient;

    const newEntry = {
      drug: accepted.antibiotic,
      dose: accepted.dose || 'as prescribed',
      frequency: 'as prescribed',
      duration: 'as prescribed',
      startDate: accepted.date,
      reason: `Prescribed via RxGuard (${accepted.name || accepted.antibiotic})`,
      _fromPrescribeTab: true,
    };

    // Replace any existing entry with the same drug key, otherwise prepend
    const filtered = (resolvedPatient.newMeds || []).filter(m => m.drug !== accepted.antibiotic);
    return { ...resolvedPatient, newMeds: [newEntry, ...filtered] };
  };

  const handlePatientSelect = async (id) => {
    setSelectedPatientId(id);
    setCurrentStep(1);
    setResolvedAlerts([]);
    setDischargeOutput(null);
    setSelectedCascade(null);
    setSafetyResult(null);

    if (!id) { setPatient(null); return; }

    // For FHIR patients, fetch full detail and map to discharge schema
    if (String(id).startsWith('fhir-')) {
      setPatientLoading(true);
      const full = await getDischargePatient(id);
      setPatient(injectAcceptedPrescription(full));
      setPatientLoading(false);
    } else {
      const local = dischargePatientsAll.find(p => p.id === id) || null;
      setPatient(injectAcceptedPrescription(local));
    }
  };

  const handleRunSafetyCheck = () => {
    if (!patient || safetyLoading) return;
    setCurrentStep(2);
  };

  const handleAlertResolve = (alert, action) => {
    setResolvedAlerts(prev => [...prev, alert.title]);
    showNotification('success', `"${alert.title}" marked as ${action}`);
  };

  const handleCascadeClick = (cascade) => {
    setSelectedCascade(cascade.details || cascade);
  };

  const handleGenerate = async () => {
    if (!proceedCheck?.canProceed) return;
    setGenerating(true);
    setCurrentStep(3);
    try {
      const [instructions, followUp] = await Promise.all([
        generateMedicationInstructions(patient),
        generateFollowUpActions(patient, safetyResult.allAlerts)
      ]);
      setDischargeOutput({ instructions, followUp });
      setCurrentStep(4);
    } catch {
      showNotification('warning', 'Error generating discharge instructions. Using fallback.');
      setCurrentStep(2);
    } finally {
      setGenerating(false);
    }
  };

  const allMeds = patient ? [...patient.continuingMeds, ...patient.newMeds] : [];
  const totalAlerts = safetyResult?.stats.total || 0;
  const criticalCount = safetyResult?.stats.critical || 0;
  const majorCount = safetyResult?.stats.major || 0;
  const unresolvedCount = totalAlerts - resolvedAlerts.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

      {/* Notification */}
      {notification && (
        <div className={`mb-4 px-4 py-3 rounded-xl border flex items-center gap-3 animate-fade-in ${
          notification.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          {notification.type === 'success'
            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
            : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Discharge Safety Review</h1>
        <p className="text-sm text-gray-500 mt-1">
          RxGuard checks every discharge for ADEs, cascades, interactions, and dosing concerns before the patient leaves.
        </p>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* Patient Selector */}
      <div className="card p-5 mb-6 animate-fade-in">
        <div className="flex items-center justify-between mb-3">
          <label className="section-title">
            <Users className="w-3.5 h-3.5" />
            Select Discharge Patient
          </label>
          {patientsLoading && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading FHIR…
            </span>
          )}
        </div>
        <div className="relative">
          <select
            value={selectedPatientId}
            onChange={e => handlePatientSelect(e.target.value)}
            disabled={patientLoading}
            className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium
                       text-gray-900 shadow-card focus:outline-none focus:ring-2 focus:ring-clinical-teal/40
                       focus:border-clinical-teal transition-all duration-200 cursor-pointer
                       disabled:opacity-60 disabled:cursor-wait"
          >
            <option value="">Choose a patient…</option>

            <optgroup label="── Demo Patients ──">
              {dischargePatientsAll.filter(p => p._isDemo).map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.age}y · {p.demo}
                </option>
              ))}
            </optgroup>

            {dischargePatientsAll.filter(p => !p._isDemo).length > 0 && (
              <optgroup label="── Live FHIR Patients ──">
                {dischargePatientsAll.filter(p => !p._isDemo).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.age}y · {p.demo}
                  </option>
                ))}
              </optgroup>
            )}

            {patientsLoading && dischargePatientsAll.filter(p => !p._isDemo).length === 0 && (
              <optgroup label="── Live FHIR Patients ──">
                <option disabled value="">Loading from FHIR server…</option>
              </optgroup>
            )}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {patient && (
        <>
          {/* ── STEP 1: MEDICATION PICTURE ── */}
          <section className="space-y-4 mb-6 animate-fade-in">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-clinical-teal" />
              <h2 className="font-semibold text-gray-800">Step 1 — Medication Picture</h2>
            </div>
            <MedicationPicture patient={patient} flaggedMeds={flaggedMeds} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PatientLabsCard labs={patient.labs} />
              <SymptomsList
                symptoms={patient.symptoms}
                onSymptomClick={(symptom) =>
                  showNotification('warning', `Symptom "${symptom.symptom}" — check for drug causes in Step 2`)
                }
              />
            </div>

            {currentStep === 1 && (
              <div className="flex justify-end">
                <button
                  onClick={handleRunSafetyCheck}
                  className="flex items-center gap-2 bg-clinical-navy text-white px-6 py-3 rounded-xl
                             font-semibold text-sm shadow-md hover:bg-clinical-teal active:scale-95 transition-all duration-150"
                >
                  <Zap className="w-4 h-4" />
                  Run Safety Check
                </button>
              </div>
            )}
          </section>

          {/* ── STEP 2+: SAFETY ALERTS — loading / error / results ── */}
          {currentStep >= 2 && safetyLoading && (
            <div className="card p-12 text-center animate-fade-in">
              <Loader2 className="w-10 h-10 animate-spin text-clinical-teal mx-auto mb-4" />
              <p className="font-semibold text-gray-800">Running safety checks…</p>
              <p className="text-sm text-gray-500 mt-1">Checking interactions, renal dosing, ADEs, and prescribing cascades.</p>
            </div>
          )}

          {currentStep >= 2 && safetyError && !safetyLoading && (
            <div className="card p-8 text-center border-red-200 animate-fade-in">
              <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <p className="font-semibold text-red-800">Safety check unavailable</p>
              <p className="text-sm text-red-600 mt-1">{safetyError}</p>
            </div>
          )}

          {currentStep >= 2 && safetyResult && !safetyLoading && (
            <section className="space-y-4 mb-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h2 className="font-semibold text-gray-800">Step 2 — Safety Alerts</h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <SeverityBadge count={criticalCount} label="Critical" color="bg-red-100 text-red-800" />
                  <SeverityBadge count={majorCount} label="Major" color="bg-orange-100 text-orange-800" />
                  <SeverityBadge count={safetyResult.stats.moderate} label="Moderate" color="bg-yellow-100 text-yellow-800" />
                  {resolvedAlerts.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3" /> {resolvedAlerts.length} Resolved
                    </span>
                  )}
                </div>
              </div>

              {totalAlerts === 0 ? (
                <div className="card p-8 text-center animate-fade-in">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="font-semibold text-gray-900">No safety concerns detected</p>
                  <p className="text-sm text-gray-500 mt-1">This patient's medication profile looks clean.</p>
                </div>
              ) : (
                <SafetyAlertPanel
                  alerts={safetyResult.alerts}
                  onResolve={handleAlertResolve}
                  resolvedAlerts={resolvedAlerts}
                />
              )}

              {/* Cascade Flow — shown when clinician clicks a cascade alert */}
              {cascadeAlerts.length > 0 && (
                <div className="card p-5 animate-fade-in">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-base">🔗</span> Prescribing Cascades Detected
                  </h3>
                  <div className="space-y-2 mb-4">
                    {cascadeAlerts.map((alert, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleCascadeClick(alert)}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-150 ${
                          selectedCascade === (alert.details || alert)
                            ? 'bg-clinical-navy text-white border-clinical-navy'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-clinical-teal hover:bg-clinical-teal/5'
                        }`}
                      >
                        {alert.title}
                        {alert.savings && (
                          <span className="ml-2 text-xs opacity-70">· {alert.savings}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  {selectedCascade && <CascadeFlowDiagram cascade={selectedCascade} />}
                </div>
              )}

              {/* Proceed / block check */}
              {currentStep < 4 && (
                <div className={`rounded-xl border p-4 flex items-start justify-between gap-4 ${
                  proceedCheck?.canProceed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {proceedCheck?.canProceed
                      ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      : <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
                    <div>
                      <p className={`font-semibold text-sm ${proceedCheck?.canProceed ? 'text-green-800' : 'text-red-800'}`}>
                        {proceedCheck?.canProceed
                          ? proceedCheck.warning
                            ? `Ready to generate — ${proceedCheck.warning}`
                            : 'All clear — ready to generate discharge instructions'
                          : proceedCheck?.reason}
                      </p>
                      {!proceedCheck?.canProceed && (
                        <p className="text-xs text-red-600 mt-1">
                          Resolve all critical alerts before proceeding. {unresolvedCount} alert{unresolvedCount !== 1 ? 's' : ''} remaining.
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={!proceedCheck?.canProceed || generating}
                    className="flex-shrink-0 flex items-center gap-2 bg-clinical-teal text-white px-5 py-2.5 rounded-xl
                               font-semibold text-sm shadow-md hover:bg-clinical-navy disabled:bg-gray-300
                               disabled:cursor-not-allowed active:scale-95 transition-all duration-150"
                  >
                    {generating
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                      : <><FileText className="w-4 h-4" /> Generate Discharge</>}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* ── STEP 3: GENERATING ── */}
          {currentStep === 3 && generating && (
            <div className="card p-12 text-center animate-fade-in">
              <Loader2 className="w-10 h-10 animate-spin text-clinical-teal mx-auto mb-4" />
              <p className="font-semibold text-gray-800">Generating discharge instructions…</p>
              <p className="text-sm text-gray-500 mt-1">RxGuard AI is writing plain-language instructions for the patient.</p>
            </div>
          )}

          {/* ── STEP 4: DISCHARGE OUTPUT ── */}
          {currentStep === 4 && dischargeOutput && (
            <section className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <h2 className="font-semibold text-gray-800">Step 4 — Discharge Output</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Medication Instructions */}
                <div className="card p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-clinical-teal" />
                    Medication Instructions
                    <span className="text-xs text-gray-400 font-normal">(plain language)</span>
                  </h3>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {dischargeOutput.instructions}
                  </pre>
                </div>

                {/* Follow-up Actions */}
                <div className="card p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-clinical-teal" />
                    Follow-up Actions
                  </h3>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {dischargeOutput.followUp}
                  </pre>
                </div>
              </div>

              {/* Watch-Out Symptom Cards */}
              {allMeds.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Watch-Out Symptom Cards
                    <span className="text-xs text-gray-400 font-normal">(one per medication)</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {allMeds.map((med, idx) => (
                      <WatchOutSymptomCard
                        key={idx}
                        medication={med}
                        sideEffects={sideEffectsMap[med.drug]}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Start over */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setCurrentStep(2);
                    setDischargeOutput(null);
                  }}
                  className="text-sm text-clinical-teal hover:text-clinical-navy font-medium underline transition-colors"
                >
                  ← Back to alerts
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {/* Empty state */}
      {/* FHIR patient loading spinner */}
      {patientLoading && (
        <div className="card p-16 text-center animate-fade-in">
          <Loader2 className="w-10 h-10 animate-spin text-clinical-teal mx-auto mb-4" />
          <p className="font-semibold text-gray-800">Loading patient from FHIR…</p>
          <p className="text-sm text-gray-500 mt-1">Fetching conditions, medications, and lab results.</p>
        </div>
      )}

      {!patient && !patientLoading && (
        <div className="card p-16 text-center animate-fade-in">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-gray-300" />
          </div>
          <p className="font-semibold text-gray-800 text-lg">Select a patient to begin</p>
          <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
            RxGuard will load their medication picture and run safety checks for ADEs, cascades, interactions, and dosing concerns.
          </p>
        </div>
      )}
    </div>
  );
};

export default DischargeWorkflow;
