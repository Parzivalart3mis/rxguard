import { useState, useEffect, useMemo } from 'react';
import { Pill, AlertTriangle, Check, ChevronDown, ChevronUp, Loader2, ShieldOff, Zap } from 'lucide-react';

// ── Backend flag ───────────────────────────────────────────────────────────────
const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

// ── Local (fallback) imports — only used when USE_BACKEND=false ────────────────
import { getRecommendation as getRecommendationLocal } from '../services/recommendationEngine.js';
import { antibioticMetadata as localAntibioticMetadata } from '../data/antibiogram.js';
import { checkDrugInteractions } from '../services/interactionChecker.js';
import { generateRecommendationRationale, generateSuboptimalReasoning } from '../services/claudeApi.js';

// ── Component ─────────────────────────────────────────────────────────────────

const AntibioticRecommender = ({ patient, antibiogramData, onPrescribe, onOverride }) => {
  const [selectedAntibiotic, setSelectedAntibiotic] = useState('');
  const [showAlternatives, setShowAlternatives]     = useState(false);
  const [rationaleState, setRationaleState]         = useState({ text: null, forAntibiotic: null });
  const [suboptimalState, setSuboptimalState]       = useState({ text: null, forAntibiotic: null });

  // ── Backend mode: async recommendation state ─────────────────────────────────
  const [baseRecommendation, setBaseRecommendation] = useState(null);
  const [recommendation,     setRecommendation]     = useState(null);
  const [recLoading,         setRecLoading]          = useState(false);
  const [recError,           setRecError]            = useState(null);

  // ── Derived antibiotic list ───────────────────────────────────────────────────
  // Backend: from antibiogramData prop (fetched by App.jsx)
  // Fallback: from local static import
  const antibioticMeta     = USE_BACKEND && antibiogramData
    ? antibiogramData.antibioticMetadata
    : localAntibioticMetadata;
  const AVAILABLE_ANTIBIOTICS = Object.keys(antibioticMeta);

  // ── Base recommendation (no antibiotic selected) ──────────────────────────────
  // Used to detect viral/no-antibiotic conditions.

  // Fallback: synchronous useMemo
  const baseRecommendationLocal = useMemo(() => {
    if (USE_BACKEND || !patient) return null;
    return getRecommendationLocal(patient);
  }, [patient]);

  // Backend: fetch on patient change
  useEffect(() => {
    if (!USE_BACKEND || !patient) return;
    const ctrl = new AbortController();
    fetch('/api/recommendations', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ patient }),
      signal:  ctrl.signal,
    })
      .then((r) => r.json())
      .then((data) => setBaseRecommendation(data))
      .catch((err) => { if (err.name !== 'AbortError') console.error('base rec error:', err); });
    return () => ctrl.abort();
  }, [patient]);

  const baseRec = USE_BACKEND ? baseRecommendation : baseRecommendationLocal;
  const isViralCondition = baseRec && !baseRec.recommendation && baseRec.conditionName;

  // ── Recommendation (with selected antibiotic) ─────────────────────────────────

  // Fallback: synchronous useMemo
  const recommendationLocal = useMemo(() => {
    if (USE_BACKEND || !patient || !selectedAntibiotic) return null;
    return getRecommendationLocal(patient, selectedAntibiotic);
  }, [patient, selectedAntibiotic]);

  // Backend: fetch on patient or selectedAntibiotic change
  useEffect(() => {
    if (!USE_BACKEND || !patient || !selectedAntibiotic) return;
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecLoading(true);
    setRecError(null);
    fetch('/api/recommendations', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ patient, selectedAntibiotic }),
      signal:  ctrl.signal,
    })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => { setRecommendation(data); setRecLoading(false); })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setRecError('Failed to load recommendation');
        setRecLoading(false);
      });
    return () => { ctrl.abort(); };
  }, [patient, selectedAntibiotic]);

  // While loading, treat recommendation as null so stale data isn't shown
  const rec = USE_BACKEND ? (recLoading ? null : recommendation) : recommendationLocal;

  // ── Drug-drug interactions ────────────────────────────────────────────────────
  // Backend: returned inside rec.interactions (no separate fetch needed)
  // Fallback: synchronous local check

  const drugInteractions = useMemo(() => {
    if (USE_BACKEND) return rec?.interactions || [];
    if (!selectedAntibiotic || !patient?.currentMedicationDrugs?.length) return [];
    return checkDrugInteractions({ drug: selectedAntibiotic }, patient.currentMedicationDrugs);
  }, [rec, selectedAntibiotic, patient]);

  // ── AI rationale ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!rec?.recommendation || !patient) return;
    let ignore = false;
    generateRecommendationRationale(patient, rec.recommendation, selectedAntibiotic)
      .then((text) => { if (!ignore) setRationaleState({ text, forAntibiotic: selectedAntibiotic }); })
      .catch(() =>   { if (!ignore) setRationaleState({ text: null, forAntibiotic: selectedAntibiotic }); });
    return () => { ignore = true; };
  }, [rec, patient, selectedAntibiotic]);

  const rationale       = rationaleState.forAntibiotic === selectedAntibiotic ? rationaleState.text : null;
  const loadingRationale = !!rec?.recommendation && rationaleState.forAntibiotic !== selectedAntibiotic;

  // ── Suboptimal reasoning ──────────────────────────────────────────────────────

  const isNotRecommended = rec?.recommendation &&
    selectedAntibiotic &&
    selectedAntibiotic !== rec.recommendation.antibiotic;

  useEffect(() => {
    const selectedAssessment = rec?.selectedAntibiotic;
    if (!isNotRecommended || !rec?.recommendation || !selectedAssessment) return;
    let ignore = false;
    const selectedMeta = {
      name:     antibioticMeta[selectedAntibiotic]?.name || selectedAntibiotic,
      spectrum: selectedAssessment.spectrum,
    };
    generateSuboptimalReasoning(patient, selectedMeta, selectedAssessment, rec.recommendation)
      .then((text) => { if (!ignore) setSuboptimalState({ text, forAntibiotic: selectedAntibiotic }); })
      .catch(() =>   { if (!ignore) setSuboptimalState({ text: null, forAntibiotic: selectedAntibiotic }); });
    return () => { ignore = true; };
  }, [isNotRecommended, rec, patient, selectedAntibiotic, antibioticMeta]);

  const suboptimalText    = suboptimalState.forAntibiotic === selectedAntibiotic ? suboptimalState.text : null;
  const loadingSuboptimal = isNotRecommended && suboptimalState.forAntibiotic !== selectedAntibiotic;

  // ── Helpers ───────────────────────────────────────────────────────────────────

  if (!patient) return null;

  const handlePrescribe = () => {
    if (rec?.recommendation) {
      onPrescribe({
        antibiotic: rec.recommendation.antibiotic,
        name: rec.recommendation.name,
        dose: rec.recommendation.dose,
        followedRecommendation: true,
      });
    }
  };

  const handleOverride = () => {
    const meta = antibioticMeta[selectedAntibiotic];
    onOverride({
      antibiotic: selectedAntibiotic,
      name: meta?.name || selectedAntibiotic,
      dose: meta?.typicalDose || null,
      recommended: rec?.recommendation?.antibiotic,
    });
  };

  const isRecommended = () => {
    if (!rec || !selectedAntibiotic || !rec.recommendation) return false;
    return selectedAntibiotic === rec.recommendation.antibiotic;
  };

  const assessment = rec?.selectedAntibiotic || null;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Pill className="w-5 h-5 text-clinical-navy" />
        <h3 className="text-lg font-semibold text-gray-900">Antibiotic Selection</h3>
      </div>

      {/* Error banner (backend mode only) */}
      {recError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{recError}</p>
        </div>
      )}

      {/* Viral / No Antibiotic Banner */}
      {isViralCondition && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <ShieldOff className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800 text-sm">Antibiotic not recommended</p>
            <p className="text-sm text-blue-700 mt-0.5">
              {baseRec.conditionName} is likely viral.{' '}
              {baseRec.notes || 'Supportive care is advised.'}
            </p>
          </div>
        </div>
      )}

      {/* Antibiotic Selector */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Select antibiotic you intend to prescribe
        </label>
        <select
          value={selectedAntibiotic}
          onChange={(e) => setSelectedAntibiotic(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clinical-teal focus:border-transparent"
        >
          <option value="">Choose an antibiotic...</option>
          {AVAILABLE_ANTIBIOTICS.map((abx) => (
            <option key={abx} value={abx}>
              {antibioticMeta[abx]?.name || abx}
            </option>
          ))}
        </select>
      </div>

      {/* Loading spinner (backend mode) */}
      {recLoading && (
        <div className="flex items-center gap-2 text-gray-500 mb-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading recommendation...</span>
        </div>
      )}

      {selectedAntibiotic && assessment && !recLoading && (
        <>
          {/* Recommendation status */}
          <div className={`p-4 rounded-lg mb-4 ${
            isRecommended()
              ? 'bg-green-50 border border-green-200'
              : 'bg-amber-50 border border-amber-200'
          }`}>
            <div className="flex items-start gap-3">
              {isRecommended() ? (
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`font-semibold ${isRecommended() ? 'text-green-800' : 'text-amber-800'}`}>
                  {isRecommended()
                    ? 'This is the recommended first-line option'
                    : 'A better alternative may be available'}
                </p>
                {!isRecommended() && rec?.recommendation && (
                  <p className="text-sm text-amber-700 mt-1">
                    Consider {rec.recommendation.name} instead
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Why selected antibiotic is suboptimal */}
          {!isRecommended() && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-amber-800">Why this may not be optimal</p>
              </div>
              {loadingSuboptimal && (
                <div className="flex items-center gap-2 text-amber-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Analysing selection...</span>
                </div>
              )}
              {suboptimalText && (
                <p className="text-sm text-amber-700">{suboptimalText}</p>
              )}
            </div>
          )}

          {/* Drug details */}
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Recommended dose</span>
              <span className="text-sm font-medium text-gray-900">{assessment.dose}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Spectrum</span>
              <span className={`text-sm font-medium px-2 py-1 rounded ${
                assessment.spectrum === 'narrow' ? 'bg-green-100 text-green-800' :
                assessment.spectrum === 'medium' ? 'bg-blue-100 text-blue-800' :
                'bg-purple-100 text-purple-800'
              }`}>
                {assessment.spectrum}
              </span>
            </div>
            {import.meta.env.DEV && assessment?.rxnormCui && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-400">RxNorm CUI</span>
                <span className="text-xs font-mono text-gray-400">{assessment.rxnormCui}</span>
              </div>
            )}
            {assessment.resistanceData && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Local susceptibility</span>
                <span className={`text-sm font-medium ${
                  assessment.resistanceData.susceptibility >= 90 ? 'text-green-600' :
                  assessment.resistanceData.susceptibility >= 80 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {assessment.resistanceData.susceptibility}%
                  <span className="text-gray-400 text-xs ml-1">({assessment.resistanceData.pathogen})</span>
                </span>
              </div>
            )}
            {rec?.duration && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Treatment duration</span>
                <span className="text-sm font-medium text-gray-900">{rec.duration}</span>
              </div>
            )}
          </div>

          {/* Warnings */}
          {assessment.safe === false && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm font-semibold text-red-800 mb-1">Allergy Warning — Cannot Prescribe</p>
              {assessment.allergyWarnings?.map((warning, idx) => (
                <p key={idx} className="text-sm text-red-700">{warning}</p>
              ))}
            </div>
          )}

          {/* Drug-Drug Interaction Warnings */}
          {drugInteractions.length > 0 && (
            <div className="mb-4 space-y-2">
              {drugInteractions.map((interaction, idx) => {
                const isMajor = interaction.severity === 'major';
                return (
                  <div
                    key={idx}
                    className={`rounded-lg p-3 border ${
                      isMajor ? 'bg-red-50 border-red-300' : 'bg-orange-50 border-orange-200'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <Zap className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isMajor ? 'text-red-600' : 'text-orange-500'}`} />
                      <div>
                        <p className={`text-sm font-semibold ${isMajor ? 'text-red-800' : 'text-orange-800'}`}>
                          {isMajor ? 'Major' : 'Moderate'} Drug Interaction — {interaction.withDrug?.name || interaction.withDrug?.drug}
                        </p>
                        <p className={`text-sm mt-0.5 ${isMajor ? 'text-red-700' : 'text-orange-700'}`}>
                          {interaction.effect}
                        </p>
                        <p className={`text-xs mt-1 font-medium ${isMajor ? 'text-red-600' : 'text-orange-600'}`}>
                          Action: {interaction.action}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {assessment.recentUseWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm font-semibold text-amber-800 mb-1">Recent Antibiotic Use</p>
              <p className="text-sm text-amber-700">{assessment.recentUseWarning}</p>
            </div>
          )}

          {assessment.concerns?.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">Considerations</p>
              <ul className="space-y-1">
                {assessment.concerns.map((concern, idx) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-amber-500">•</span>
                    {concern}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Clinical rationale */}
          {rationale && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">{rationale}</p>
            </div>
          )}
          {loadingRationale && (
            <div className="flex items-center gap-2 text-gray-500 mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Generating rationale...</span>
            </div>
          )}

          {/* Alternatives */}
          {rec?.alternatives?.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => setShowAlternatives(!showAlternatives)}
                className="flex items-center gap-2 text-sm font-medium text-clinical-teal hover:text-clinical-navy"
              >
                {showAlternatives ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showAlternatives ? 'Hide' : 'Show'} alternative options ({rec.alternatives.length})
              </button>

              {showAlternatives && (
                <div className="mt-2 space-y-2">
                  {rec.alternatives.map((alt, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{alt.name}</p>
                          <p className="text-sm text-gray-600">{alt.dose}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          alt.spectrum === 'narrow' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {alt.spectrum}
                        </span>
                      </div>
                      {alt.resistanceData && (
                        <p className="text-xs text-gray-500 mt-1">
                          {alt.resistanceData.pathogen} susceptibility: {alt.resistanceData.susceptibility}%
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={handlePrescribe}
              disabled={assessment?.safe === false}
              className="flex-1 bg-clinical-teal text-white py-2 px-4 rounded-lg font-medium hover:bg-clinical-navy disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Accept Recommendation
            </button>
            <button
              onClick={handleOverride}
              disabled={isRecommended()}
              className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Override &amp; Prescribe Selected
            </button>
          </div>
        </>
      )}

      {!selectedAntibiotic && rec?.notes && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">{rec.notes}</p>
        </div>
      )}
    </div>
  );
};

export default AntibioticRecommender;
