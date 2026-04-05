import { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle, CheckCircle, Loader2,
  ClipboardList, Zap, FileText, Users, ArrowRight, ShieldCheck, Printer, ArrowLeft, RefreshCw, Upload
} from 'lucide-react';

import PageHeader from './PageHeader.jsx';
import StepIndicator from './StepIndicator.jsx';
import MedicationPicture from './MedicationPicture.jsx';
import PatientLabsCard from './PatientLabsCard.jsx';
import SymptomsList from './SymptomsList.jsx';
import SafetyAlertPanel from './SafetyAlertPanel.jsx';
import CascadeFlowDiagram from './CascadeFlowDiagram.jsx';
import WatchOutSymptomCard from './WatchOutSymptomCard.jsx';

import { useDischargePatients } from '../hooks/useDischargePatients.js';
import { generateMedicationInstructions, generateFollowUpActions } from '../services/dischargeGenerator.js';
import { usePatientContext } from '../contexts/PatientContext.jsx';

const canDischargeProceed = (safetyResult, resolvedAlertIds = []) => {
  const allAlerts = [
    ...(safetyResult.alerts.critical  || []),
    ...(safetyResult.alerts.major     || []),
    ...(safetyResult.alerts.moderate  || []),
    ...(safetyResult.alerts.minor     || []),
  ];
  const unresolved = allAlerts.filter(a => !resolvedAlertIds.includes(a.title));
  if (unresolved.length > 0) {
    return {
      canProceed: false,
      reason: `${unresolved.length} alert(s) must be acknowledged or resolved before proceeding`,
      blockingAlerts: unresolved,
    };
  }
  return { canProceed: true, warning: null };
};

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

/**
 * Renders AI-generated discharge text with basic markdown support:
 * **bold**, numbered lists, bullet lines (☐ • -), and blank-line paragraphs.
 * No external dependency — keeps the bundle light.
 */
const DischargeText = ({ text, className = '' }) => {
  if (!text) return null;

  const renderInline = (str) => {
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : part
    );
  };

  const lines = text.split('\n');

  return (
    <div className={`text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-1 ${className}`}>
      {lines.map((line, i) => {
        if (line.trim() === '') return <div key={i} className="h-2" />;

        // Checkbox lines
        if (line.trimStart().startsWith('☐')) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-clinical-teal flex-shrink-0 mt-0.5">☐</span>
              <span>{renderInline(line.replace(/^[\s☐]+/, ''))}</span>
            </div>
          );
        }

        // Numbered list items
        const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (numberedMatch) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="font-bold text-clinical-teal flex-shrink-0 w-5 text-right">{numberedMatch[1]}.</span>
              <span>{renderInline(numberedMatch[2])}</span>
            </div>
          );
        }

        // Bullet lines (• or -)
        if (line.trimStart().startsWith('•') || line.trimStart().startsWith('- ')) {
          return (
            <div key={i} className="flex items-start gap-2 pl-4">
              <span className="flex-shrink-0 mt-0.5 text-slate-400">•</span>
              <span>{renderInline(line.replace(/^[\s•\-]+/, ''))}</span>
            </div>
          );
        }

        // Section headers (ALL CAPS lines or lines ending with :)
        if (line === line.toUpperCase() && line.trim().length > 3) {
          return <p key={i} className="font-bold text-gray-800 dark:text-gray-200 mt-3">{renderInline(line)}</p>;
        }

        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
};

const DischargeWorkflow = ({ onNavigate }) => {
  const { patients: dischargePatientsAll, getDischargePatient } = useDischargePatients();
  const { activePatient, acceptedPrescriptions } = usePatientContext();

  const [currentStep, setCurrentStep] = useState(1);
  const [resolvedAlerts, setResolvedAlerts] = useState([]);
  const [ehrWriteState, setEhrWriteState] = useState(null); // null | 'writing' | { resourceId } | 'error'

  const prescription = activePatient ? acceptedPrescriptions?.[activePatient.name] : null;

  const handleWriteToEHR = async () => {
    if (!prescription || !activePatient) return;
    setEhrWriteState('writing');
    try {
      const res = await fetch('/api/fhir/medication-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId:   activePatient.id,
          patientName: activePatient.name,
          antibiotic:  prescription.antibiotic,
          displayName: prescription.name,
          dose:        prescription.dose,
          duration:    prescription.duration,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Write failed');
      setEhrWriteState({ resourceId: data.resourceId });
    } catch (err) {
      setEhrWriteState('error');
    }
  };
  const [generating, setGenerating] = useState(false);
  const [dischargeOutput, setDischargeOutput] = useState(null);
  const [selectedCascade, setSelectedCascade] = useState(null);
  const [notification, setNotification] = useState(null);
  const [patient, setPatient] = useState(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [noDataAvailable, setNoDataAvailable] = useState(false);

  const [safetyResult, setSafetyResult] = useState(null);
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [safetyError, setSafetyError] = useState(null);
  const [sideEffectsMap, setSideEffectsMap] = useState({});
  const [switchedMeds, setSwitchedMeds] = useState({});       // { alertTitle: { from, to: { drug, dose, frequency, duration } } }
  const [switchMedPending, setSwitchMedPending] = useState(null); // { alert, drugName, origMed }
  const [switchMedForm, setSwitchMedForm] = useState({ drug: '', dose: '', frequency: '', duration: '' });

  const injectAcceptedPrescription = (resolvedPatient) => {
    if (!resolvedPatient) return resolvedPatient;
    const accepted = acceptedPrescriptions[resolvedPatient.name];
    if (!accepted) return resolvedPatient;
    const newEntry = {
      drug: accepted.antibiotic,
      dose: accepted.dose || 'as prescribed',
      frequency: accepted.frequency || 'as prescribed',
      duration: accepted.duration || 'as prescribed',
      startDate: accepted.date,
      reason: `Prescribed via AegisRx (${accepted.name || accepted.antibiotic})`,
      _fromPrescribeTab: true,
      _isOverride: accepted.isOverride || false,
    };
    const filtered = (resolvedPatient.newMeds || []).filter(m =>
      m.drug !== accepted.antibiotic &&
      (!accepted.recommended || m.drug !== accepted.recommended)
    );
    return { ...resolvedPatient, newMeds: [newEntry, ...filtered] };
  };

  useEffect(() => {
    // Reset state on activePatient change
    setCurrentStep(1);
    setResolvedAlerts([]);
    setDischargeOutput(null);
    setSelectedCascade(null);
    setSafetyResult(null);
    setSideEffectsMap({});
    setSafetyError(null);
    setSwitchedMeds({});
    setPatient(null);
    setNoDataAvailable(false);

    if (!activePatient) return;

    const loadData = async () => {
      setPatientLoading(true);
      if (String(activePatient.id).startsWith('fhir-')) {
        const full = await getDischargePatient(activePatient.id);
        if (full) {
          setPatient(injectAcceptedPrescription(full));
        } else {
          setNoDataAvailable(true);
        }
      } else {
        const local = dischargePatientsAll.find(p => p.id === activePatient.id || p.name === activePatient.name);
        if (local) {
          setPatient(injectAcceptedPrescription(local));
        } else {
          setNoDataAvailable(true);
        }
      }
      setPatientLoading(false);
    };

    loadData();
  }, [activePatient, getDischargePatient, dischargePatientsAll, acceptedPrescriptions]);

  useEffect(() => {
    if (!patient) return;
    
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

  // Synthetic alert for non-recommended override prescriptions
  const overrideAlert = useMemo(() => {
    if (!patient) return null;
    const rx = acceptedPrescriptions[patient.name];
    if (!rx?.isOverride) return null;
    return {
      title: `Non-Recommended Override — ${rx.name || rx.antibiotic}`,
      description: `${rx.name || rx.antibiotic} was prescribed instead of the recommended ${rx.recommended || 'guideline drug'}. Override reason: ${rx.overrideReason}${rx.overrideNotes ? `. Notes: ${rx.overrideNotes}` : ''}.`,
      severity: 'major',
      type: 'override',
      medications: [{ drug: rx.antibiotic }],
      details: {
        drug: rx.antibiotic,
        recommended_drug: rx.recommended || '',
        recommended_dose: '',
        recommended_frequency: '',
      },
    };
  }, [patient, acceptedPrescriptions]);

  // safetyResult augmented with the override alert for display and proceed checks
  const effectiveSafetyResult = useMemo(() => {
    if (!safetyResult) return null;
    if (!overrideAlert) return safetyResult;
    return {
      ...safetyResult,
      alerts: {
        ...safetyResult.alerts,
        major: [overrideAlert, ...(safetyResult.alerts.major || [])],
      },
      allAlerts: [overrideAlert, ...(safetyResult.allAlerts || [])],
      stats: {
        ...safetyResult.stats,
        major: (safetyResult.stats.major || 0) + 1,
        total: (safetyResult.stats.total || 0) + 1,
      },
    };
  }, [safetyResult, overrideAlert]);

  const cascadeAlerts = effectiveSafetyResult?.allAlerts.filter(a => a.type === 'cascade') || [];
  const proceedCheck = effectiveSafetyResult ? canDischargeProceed(effectiveSafetyResult, resolvedAlerts) : null;

  // Patient with any "Switch Med" replacements applied — used for display and discharge generation
  const displayPatient = useMemo(() => {
    if (!patient || Object.keys(switchedMeds).length === 0) return patient;
    let updated = { ...patient, continuingMeds: [...patient.continuingMeds], newMeds: [...patient.newMeds] };
    for (const { from, to } of Object.values(switchedMeds)) {
      const newEntry = {
        drug: to.drug,
        dose: to.dose || 'as prescribed',
        frequency: to.frequency || 'as prescribed',
        duration: to.duration || 'as prescribed',
        reason: `Switched from ${from} (safety review)`,
        _switchedFrom: from,
      };
      updated = {
        ...updated,
        continuingMeds: updated.continuingMeds.map(m => m.drug === from ? newEntry : m),
        newMeds: updated.newMeds.map(m => m.drug === from ? newEntry : m),
      };
    }
    return updated;
  }, [patient, switchedMeds]);

  const extractDrugFromAlert = (alert) => {
    if (alert.details?.topMatch?.drug) return alert.details.topMatch.drug;
    if (alert.details?.drug) return alert.details.drug;
    if (alert.details?.drug1?.drug) return alert.details.drug1.drug;
    if (alert.medications?.[0]?.drug) return alert.medications[0].drug;
    return null;
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRunSafetyCheck = () => { if (!patient || safetyLoading) return; setCurrentStep(2); };
  const handleAlertResolve = (alert, action) => {
    if (action === 'switch') {
      const drugName = extractDrugFromAlert(alert);
      const origMed = [...(patient?.continuingMeds || []), ...(patient?.newMeds || [])].find(m => m.drug === drugName);
      const rec = alert.details;
      setSwitchMedPending({ alert, drugName, origMed });
      setSwitchMedForm({
        drug:      rec?.recommended_drug      || drugName || '',
        dose:      rec?.recommended_dose      || '',
        frequency: rec?.recommended_frequency || '',
        duration:  '',
      });
      return;
    }
    setResolvedAlerts(prev => [...prev, alert.title]);
    showNotification('success', `"${alert.title}" marked as ${action}`);
  };

  const handleSwitchMedConfirm = () => {
    if (!switchMedPending || !switchMedForm.drug.trim()) return;
    const { alert, drugName } = switchMedPending;
    if (drugName) {
      setSwitchedMeds(prev => ({ ...prev, [alert.title]: { from: drugName, to: { ...switchMedForm, drug: switchMedForm.drug.trim() } } }));
    }
    setResolvedAlerts(prev => [...prev, alert.title]);
    showNotification('success', `Switched "${drugName || 'medication'}" to "${switchMedForm.drug.trim()}"`);
    setSwitchMedPending(null);
    setSwitchMedForm({ drug: '', dose: '', frequency: '', duration: '' });
  };
  const handleCascadeClick = (cascade) => setSelectedCascade(cascade.details || cascade);

  const handleGenerate = async () => {
    if (!proceedCheck?.canProceed) return;
    setGenerating(true);
    setCurrentStep(3);
    try {
      const [instructions, followUp] = await Promise.all([
        generateMedicationInstructions(displayPatient, sideEffectsMap),
        generateFollowUpActions(displayPatient, effectiveSafetyResult.allAlerts),
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

  const allMeds = displayPatient ? [...displayPatient.continuingMeds, ...displayPatient.newMeds] : [];
  const totalAlerts = effectiveSafetyResult?.stats.total || 0;
  const criticalCount = effectiveSafetyResult?.stats.critical || 0;
  const majorCount = effectiveSafetyResult?.stats.major || 0;
  const unresolvedCount = totalAlerts - resolvedAlerts.length;

  return (
    <div className="page-wrapper animate-fade-in">

      {/* Workflow Navigation */}
      {onNavigate && (
        <button 
          onClick={() => onNavigate('prescribe')}
          className="mb-6 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-clinical-teal transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Prescribe
        </button>
      )}

      {/* Notification */}
      {notification && (
        <div className={`mb-5 px-4 py-3 rounded-xl border flex items-center gap-3 animate-fade-in ${notification.type === 'success'
            ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/40 text-green-800 dark:text-green-300'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300'
          }`}>
          {notification.type === 'success'
            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
            : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}

      <PageHeader
        icon={ShieldCheck}
        title="Discharge Safety Review"
        subtitle="AegisRx checks every discharge for ADEs, prescribing cascades, drug interactions, and renal dosing concerns."
      />

      {/* Empty State: No active patient */}
      {!activePatient && !patientLoading && (
        <div className="card p-16 text-center animate-fade-in mt-8">
          <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-gray-100 dark:border-gray-700">
            <Users className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">No patient selected</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            Please return to the Prescribe tab to select a patient, or select one from the sidebar if available.
          </p>
          {onNavigate && (
            <button onClick={() => onNavigate('prescribe')} className="btn-primary mt-6">
              Go to Prescribe <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* FHIR/Data loading */}
      {patientLoading && (
        <div className="card p-16 text-center animate-fade-in mt-8">
          <Loader2 className="w-8 h-8 animate-spin text-clinical-teal mx-auto mb-4" />
          <p className="font-semibold text-gray-900 dark:text-gray-100">Loading discharge data…</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Fetching conditions, medications, and lab results for {activePatient?.name}.
          </p>
        </div>
      )}

      {/* Empty state: No data for this patient */}
      {activePatient && noDataAvailable && !patientLoading && (
        <div className="card p-16 text-center border-amber-200 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-950/10 animate-fade-in mt-8">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <ClipboardList className="w-8 h-8 text-amber-500" />
          </div>
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">No discharge data available</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            There is no matching discharge-schema data for <strong>{activePatient.name}</strong>. Please select a different patient or use one of the Demo Patients in the Prescribe tab.
          </p>
        </div>
      )}

      {patient && (
        <>
          {/* Step indicator */}
          <StepIndicator currentStep={currentStep} />
          
          {/* STEP 1 — Medication Picture */}
          <section className="space-y-5 mb-7 animate-fade-in mt-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-clinical-teal flex items-center justify-center flex-shrink-0 shadow-sm border border-clinical-teal/20">
                <span className="text-[10px] font-bold text-white">1</span>
              </div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Medication Picture</h2>
            </div>
            <MedicationPicture patient={displayPatient} flaggedMeds={flaggedMeds} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <PatientLabsCard labs={patient.labs} />
              <SymptomsList
                symptoms={patient.symptoms}
                onSymptomClick={(symptom) =>
                  showNotification('warning', `Symptom "${symptom.symptom}" — check for drug causes in Step 2`)
                }
              />
            </div>
            {currentStep === 1 && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleRunSafetyCheck}
                  className="btn-primary px-7"
                >
                  <Zap className="w-4 h-4" />
                  Run Safety Check
                  <ArrowRight className="w-4 h-4 opacity-70" />
                </button>
              </div>
            )}
          </section>

          {/* STEP 2+ — Safety alerts loading */}
          {currentStep >= 2 && safetyLoading && (
            <div className="card p-14 text-center animate-fade-in mb-7">
              <div className="w-14 h-14 bg-clinical-teal/10 dark:bg-clinical-teal/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-clinical-teal/10">
                <Loader2 className="w-7 h-7 animate-spin text-clinical-teal" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Running safety checks…</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-center gap-2">
                <Zap className="w-3.5 h-3.5" /> Checking interactions, renal dosing, ADEs, and prescribing cascades.
              </p>
            </div>
          )}

          {/* STEP 2+ — Safety error */}
          {currentStep >= 2 && safetyError && !safetyLoading && (
            <div className="card p-10 text-center border-red-200 dark:border-red-800/40 animate-fade-in mb-7 bg-red-50/30 dark:bg-red-950/10">
              <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <p className="font-semibold text-red-800 dark:text-red-300">Safety check unavailable</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{safetyError}</p>
            </div>
          )}

          {/* STEP 2+ — Safety results */}
          {currentStep >= 2 && effectiveSafetyResult && !safetyLoading && (
            <section className="space-y-5 mb-7 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-clinical-teal flex items-center justify-center flex-shrink-0 shadow-sm border border-clinical-teal/20">
                    <span className="text-[10px] font-bold text-white">2</span>
                  </div>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">Safety Alerts</h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <SeverityBadge count={criticalCount} label="Critical" color="badge-critical" />
                  <SeverityBadge count={majorCount} label="Major" color="badge-major" />
                  <SeverityBadge count={safetyResult.stats.moderate} label="Moderate" color="badge-moderate" />
                  {resolvedAlerts.length > 0 && (
                    <span className="badge bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                      <CheckCircle className="w-3 h-3" /> {resolvedAlerts.length} Resolved
                    </span>
                  )}
                </div>
              </div>

              {totalAlerts === 0 ? (
                <div className="card p-10 text-center animate-fade-in">
                  <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-100 dark:border-green-800">
                    <CheckCircle className="w-7 h-7 text-green-500" />
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">No safety concerns detected</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">This patient's medication profile looks clean.</p>
                </div>
              ) : (
                <SafetyAlertPanel
                  alerts={effectiveSafetyResult.alerts}
                  onResolve={handleAlertResolve}
                  resolvedAlerts={resolvedAlerts}
                />
              )}

              {/* Cascade flow */}
              {cascadeAlerts.length > 0 && (
                <div className="card p-5 animate-fade-in shadow-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2 text-sm">
                    <span className="text-base">🔗</span> Prescribing Cascades Detected
                  </h3>
                  <div className="space-y-2 mb-4">
                    {cascadeAlerts.map((alert, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleCascadeClick(alert)}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-150 ${selectedCascade === (alert.details || alert)
                            ? 'bg-slate-900 dark:bg-clinical-teal text-white border-slate-900 dark:border-clinical-teal shadow-md'
                            : 'bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-clinical-teal hover:bg-clinical-teal/5'
                          }`}
                      >
                        {alert.title}
                        {alert.savings && (
                          <span className="ml-2 text-xs opacity-60">· {alert.savings}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  {selectedCascade && <CascadeFlowDiagram cascade={selectedCascade} />}
                </div>
              )}

              {/* Proceed/block */}
              {currentStep < 4 && (
                <div className={`rounded-xl border p-4 flex items-start justify-between gap-4 shadow-sm ${proceedCheck?.canProceed
                    ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/40'
                    : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/40'
                  }`}>
                  <div className="flex items-start gap-3">
                    {proceedCheck?.canProceed
                      ? <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      : <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />}
                    <div>
                      <p className={`font-semibold text-sm ${proceedCheck?.canProceed
                          ? 'text-green-900 dark:text-green-200'
                          : 'text-red-900 dark:text-red-200'
                        }`}>
                        {proceedCheck?.canProceed
                          ? proceedCheck.warning
                            ? `Ready to generate — ${proceedCheck.warning}`
                            : 'All clear — ready to generate discharge instructions'
                          : proceedCheck?.reason}
                      </p>
                      {!proceedCheck?.canProceed && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                          Acknowledge or switch all alerts before proceeding. {unresolvedCount} alert{unresolvedCount !== 1 ? 's' : ''} remaining.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {prescription && (
                      <button
                        onClick={handleWriteToEHR}
                        disabled={ehrWriteState === 'writing' || !!ehrWriteState?.resourceId}
                        className="btn-secondary text-sm"
                      >
                        {ehrWriteState === 'writing'
                          ? <><Upload className="w-4 h-4 animate-pulse" /> Writing…</>
                          : ehrWriteState?.resourceId
                            ? <><CheckCircle className="w-4 h-4 text-green-500" /> Written to EHR</>
                            : <><Upload className="w-4 h-4" /> Write to EHR</>}
                      </button>
                    )}
                    <button
                      onClick={handleGenerate}
                      disabled={!proceedCheck?.canProceed || generating}
                      className="btn-primary"
                    >
                      {generating
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                        : <><FileText className="w-4 h-4" /> Generate Discharge</>}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* STEP 3 — Generating */}
          {currentStep === 3 && generating && (
            <div className="card p-14 text-center animate-fade-in mb-7 shadow-lg shadow-clinical-teal/5">
              <div className="w-14 h-14 bg-clinical-teal/10 dark:bg-clinical-teal/20 rounded-2xl flex items-center justify-center mx-auto mb-4 relative">
                <Loader2 className="w-7 h-7 animate-spin text-clinical-teal" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Generating discharge instructions…</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                AegisRx AI is writing plain-language instructions for the patient.
              </p>
            </div>
          )}

          {/* STEP 4 — Discharge output */}
          {currentStep === 4 && dischargeOutput && (
            <section className="space-y-7 animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-green-500/20">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Discharge Output</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Medication Instructions */}
                <div className="card p-6 shadow-md border-clinical-teal/10">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-4 h-4 text-clinical-teal" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Medication Instructions</h3>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-normal border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5">plain language</span>
                  </div>
                  <DischargeText text={dischargeOutput.instructions} />
                </div>

                {/* Follow-up Actions */}
                <div className="card p-6 shadow-md border-clinical-teal/10">
                  <div className="flex items-center gap-2 mb-4">
                    <ClipboardList className="w-4 h-4 text-clinical-teal" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Follow-up Actions</h3>
                  </div>
                  <DischargeText text={dischargeOutput.followUp} />
                </div>
              </div>

              {/* Watch-out symptom cards */}
              {allMeds.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Watch-Out Symptom Cards</h3>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">one per medication</span>
                  </div>
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

              {/* Back to alerts / Print */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => { setCurrentStep(2); setDischargeOutput(null); }}
                  className="btn-ghost text-sm text-clinical-teal hover:text-clinical-navy dark:hover:text-white no-print"
                >
                  ← Back to alerts
                </button>
                <button onClick={() => window.print()} className="btn-secondary no-print">
                  <Printer className="w-4 h-4" /> Print Instructions
                </button>
              </div>
            </section>
          )}
        </>
      )}
      {/* Switch Med Modal */}
      {switchMedPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg mx-4 p-6">

            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw className="w-4 h-4 text-clinical-teal flex-shrink-0" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Switch Medication</h3>
            </div>

            {/* Alert context */}
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 px-4 py-3 mb-5 space-y-1.5">
              {switchMedPending.alert.description && (
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {switchMedPending.alert.description}
                </p>
              )}
              {switchMedPending.alert.action && (
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                  Action: {switchMedPending.alert.action}
                </p>
              )}
              {switchMedPending.origMed && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Current: {switchMedPending.origMed.dose}{switchMedPending.origMed.frequency ? ` · ${switchMedPending.origMed.frequency}` : ''}
                  {switchMedPending.origMed.duration ? ` · ${switchMedPending.origMed.duration}` : ''}
                </p>
              )}
            </div>

            {/* Form fields */}
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  New medication <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={switchMedForm.drug}
                  onChange={e => setSwitchMedForm(f => ({ ...f, drug: e.target.value }))}
                  placeholder="e.g. amoxicillin"
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
                             text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                             focus:outline-none focus:ring-2 focus:ring-clinical-teal/50"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Dose</label>
                  <input
                    type="text"
                    value={switchMedForm.dose}
                    onChange={e => setSwitchMedForm(f => ({ ...f, dose: e.target.value }))}
                    placeholder="e.g. 500mg"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
                               text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                               focus:outline-none focus:ring-2 focus:ring-clinical-teal/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Frequency</label>
                  <input
                    type="text"
                    value={switchMedForm.frequency}
                    onChange={e => setSwitchMedForm(f => ({ ...f, frequency: e.target.value }))}
                    placeholder="e.g. twice daily"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
                               text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                               focus:outline-none focus:ring-2 focus:ring-clinical-teal/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Duration</label>
                  <input
                    type="text"
                    value={switchMedForm.duration}
                    onChange={e => setSwitchMedForm(f => ({ ...f, duration: e.target.value }))}
                    placeholder="e.g. 7 days"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
                               text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                               focus:outline-none focus:ring-2 focus:ring-clinical-teal/50"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setSwitchMedPending(null); setSwitchMedForm({ drug: '', dose: '', frequency: '', duration: '' }); }}
                className="btn-ghost text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSwitchMedConfirm}
                disabled={!switchMedForm.drug.trim()}
                className="btn-primary"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Confirm Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DischargeWorkflow;
