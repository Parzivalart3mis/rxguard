import { useState, useEffect, useMemo } from 'react';
import {
  Pill, AlertTriangle, Check, ChevronDown, ChevronUp,
  Loader2, ShieldOff, Zap, Info, CheckCircle2
} from 'lucide-react';

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

import { getRecommendation as getRecommendationLocal } from '../services/recommendationEngine.js';
import { antibioticMetadata as localAntibioticMetadata } from '../data/antibiogram.js';
import { checkDrugInteractions } from '../services/interactionChecker.js';
import { generateRecommendationRationale, generateSuboptimalReasoning } from '../services/claudeApi.js';

const AntibioticRecommender = ({ patient, antibiogramData, onPrescribe, onOverride }) => {
  const [selectedAntibiotic, setSelectedAntibiotic] = useState('');
  const [showAlternatives, setShowAlternatives]     = useState(false);
  const [rationaleState, setRationaleState]         = useState({ text: null, forAntibiotic: null });
  const [suboptimalState, setSuboptimalState]       = useState({ text: null, forAntibiotic: null });
  const [showOverrideForm, setShowOverrideForm]     = useState(false);
  const [overrideForm, setOverrideForm]             = useState({ dose: '', frequency: '', duration: '' });

  const [baseRecommendation, setBaseRecommendation] = useState(null);
  const [recommendation,     setRecommendation]     = useState(null);
  const [recLoading,         setRecLoading]         = useState(false);
  const [recError,           setRecError]           = useState(null);

  const antibioticMeta = USE_BACKEND && antibiogramData
    ? antibiogramData.antibioticMetadata
    : localAntibioticMetadata;
  const AVAILABLE_ANTIBIOTICS = Object.keys(antibioticMeta);

  const baseRecommendationLocal = useMemo(() => {
    if (USE_BACKEND || !patient) return null;
    return getRecommendationLocal(patient);
  }, [patient]);

  useEffect(() => {
    if (!USE_BACKEND || !patient) return;
    const ctrl = new AbortController();
    fetch('/api/recommendations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient }), signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then(setBaseRecommendation)
      .catch((err) => { if (err.name !== 'AbortError') console.error('base rec error:', err); });
    return () => ctrl.abort();
  }, [patient]);

  const baseRec = USE_BACKEND ? baseRecommendation : baseRecommendationLocal;
  const isViralCondition = baseRec && !baseRec.recommendation && baseRec.conditionName;

  const recommendationLocal = useMemo(() => {
    if (USE_BACKEND || !patient || !selectedAntibiotic) return null;
    return getRecommendationLocal(patient, selectedAntibiotic);
  }, [patient, selectedAntibiotic]);

  useEffect(() => {
    if (!USE_BACKEND || !patient || !selectedAntibiotic) return;
    const ctrl = new AbortController();
    setRecLoading(true);
    setRecError(null);
    fetch('/api/recommendations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient, selectedAntibiotic }), signal: ctrl.signal,
    })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => { setRecommendation(data); setRecLoading(false); })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setRecError('Failed to load recommendation');
        setRecLoading(false);
      });
    return () => ctrl.abort();
  }, [patient, selectedAntibiotic]);

  const rec = USE_BACKEND ? (recLoading ? null : recommendation) : recommendationLocal;

  const drugInteractions = useMemo(() => {
    if (USE_BACKEND) return rec?.interactions || [];
    if (!selectedAntibiotic || !patient?.currentMedicationDrugs?.length) return [];
    return checkDrugInteractions({ drug: selectedAntibiotic }, patient.currentMedicationDrugs);
  }, [rec, selectedAntibiotic, patient]);

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

  const isNotRecommended = rec?.recommendation &&
    selectedAntibiotic && selectedAntibiotic !== rec.recommendation.antibiotic;

  useEffect(() => {
    const selectedAssessment = rec?.selectedAntibiotic;
    if (!isNotRecommended || !rec?.recommendation || !selectedAssessment) return;
    let ignore = false;
    const selectedMeta = { name: antibioticMeta[selectedAntibiotic]?.name || selectedAntibiotic, spectrum: selectedAssessment.spectrum };
    generateSuboptimalReasoning(patient, selectedMeta, selectedAssessment, rec.recommendation)
      .then((text) => { if (!ignore) setSuboptimalState({ text, forAntibiotic: selectedAntibiotic }); })
      .catch(() =>   { if (!ignore) setSuboptimalState({ text: null, forAntibiotic: selectedAntibiotic }); });
    return () => { ignore = true; };
  }, [isNotRecommended, rec, patient, selectedAntibiotic, antibioticMeta]);

  const suboptimalText    = suboptimalState.forAntibiotic === selectedAntibiotic ? suboptimalState.text : null;
  const loadingSuboptimal = isNotRecommended && suboptimalState.forAntibiotic !== selectedAntibiotic;

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

  const handleOverrideClick = () => {
    setOverrideForm({
      dose: assessment?.dose || '',
      frequency: '',
      duration: rec?.duration || '',
    });
    setShowOverrideForm(true);
  };

  const handleOverrideConfirm = () => {
    const meta = antibioticMeta[selectedAntibiotic];
    onOverride({
      antibiotic: selectedAntibiotic,
      name: meta?.name || selectedAntibiotic,
      dose: overrideForm.dose || null,
      frequency: overrideForm.frequency || null,
      duration: overrideForm.duration || null,
      recommended: rec?.recommendation?.antibiotic,
    });
    setShowOverrideForm(false);
  };

  const isRecommended = () => {
    if (!rec || !selectedAntibiotic || !rec.recommendation) return false;
    return selectedAntibiotic === rec.recommendation.antibiotic;
  };

  const assessment = rec?.selectedAntibiotic || null;

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Pill className="w-4.5 h-4.5 text-clinical-navy dark:text-clinical-teal" style={{ width: '1.125rem', height: '1.125rem' }} />
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Antibiotic Selection</h3>
      </div>

      {/* Error banner */}
      {recError && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl p-3 mb-4">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">{recError}</p>
        </div>
      )}

      {/* Viral/No Antibiotic Banner */}
      {isViralCondition && (
        <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4 mb-4">
          <ShieldOff className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-200 text-sm">Antibiotic not recommended</p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-0.5 leading-relaxed">
              {baseRec.conditionName} is likely viral.{' '}{baseRec.notes || 'Supportive care is advised.'}
            </p>
          </div>
        </div>
      )}

      {/* Antibiotic Selector */}
      <div className="mb-5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Select antibiotic you intend to prescribe
        </label>
        <div className="relative">
          <select
            value={selectedAntibiotic}
            onChange={(e) => setSelectedAntibiotic(e.target.value)}
            className="select-base pr-10"
          >
            <option value="">Choose an antibiotic…</option>
            {AVAILABLE_ANTIBIOTICS.map((abx) => (
              <option key={abx} value={abx}>{antibioticMeta[abx]?.name || abx}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Loading spinner */}
      {recLoading && (
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 mb-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading recommendation…</span>
        </div>
      )}

      {selectedAntibiotic && assessment && !recLoading && (
        <>
          {/* Recommendation status */}
          <div className={`rounded-xl p-4 mb-4 border ${
            isRecommended()
              ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/40'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40'
          }`}>
            <div className="flex items-start gap-3">
              {isRecommended()
                ? <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                : <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              }
              <div>
                <p className={`font-semibold text-sm ${
                  isRecommended()
                    ? 'text-green-900 dark:text-green-200'
                    : 'text-amber-900 dark:text-amber-200'
                }`}>
                  {isRecommended()
                    ? 'This is the recommended first-line option'
                    : 'A better alternative may be available'}
                </p>
                {!isRecommended() && rec?.recommendation && (
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                    Consider <strong>{rec.recommendation.name}</strong> instead
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Suboptimal reasoning */}
          {!isRecommended() && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">
                Why this may not be optimal
              </p>
              {loadingSuboptimal && (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-sm">Analysing selection…</span>
                </div>
              )}
              {suboptimalText && (
                <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{suboptimalText}</p>
              )}
            </div>
          )}

          {/* Drug details table */}
          <div className="space-y-0 mb-4 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="data-row px-4">
              <span className="data-label">Recommended dose</span>
              <span className="data-value">{assessment.dose}</span>
            </div>
            <div className="data-row px-4">
              <span className="data-label">Spectrum</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                assessment.spectrum === 'narrow' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                assessment.spectrum === 'medium' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
              }`}>
                {assessment.spectrum}
              </span>
            </div>
            {import.meta.env.DEV && assessment?.rxnormCui && (
              <div className="data-row px-4">
                <span className="text-sm text-gray-400 dark:text-gray-500">RxNorm CUI</span>
                <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{assessment.rxnormCui}</span>
              </div>
            )}
            {assessment.resistanceData && (
              <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="data-label">
                    {assessment.resistanceData.isCultureGuided ? 'Culture-guided coverage' : 'Expected local coverage'}
                  </span>
                  <span className={`text-sm font-semibold ${
                    assessment.resistanceData.expectedCoverage >= 90 ? 'text-green-600 dark:text-green-400' :
                    assessment.resistanceData.expectedCoverage >= 80 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {assessment.resistanceData.expectedCoverage}%
                    {assessment.resistanceData.isCultureGuided && (
                      <span className="ml-1.5 text-xs font-normal px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">culture</span>
                    )}
                  </span>
                </div>
                {/* Per-pathogen breakdown */}
                {assessment.resistanceData.pathogens?.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {assessment.resistanceData.pathogens.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                        <span>{p.pathogen}</span>
                        <span className="flex items-center gap-1.5">
                          <span className={
                            p.susceptibility >= 90 ? 'text-green-500 dark:text-green-400' :
                            p.susceptibility >= 80 ? 'text-yellow-500 dark:text-yellow-400' :
                            'text-red-500 dark:text-red-400'
                          }>{p.susceptibility}%</span>
                          {p.trend === 'declining' && <span title="Resistance trend worsening">↓</span>}
                          {p.trend === 'stable' && <span title="Resistance trend stable">→</span>}
                        </span>
                      </div>
                    ))}
                    {!assessment.resistanceData.isCultureGuided && assessment.resistanceData.pathogens.length > 1 && (
                      <p className="text-xs text-gray-400 dark:text-gray-600 italic mt-1">
                        Weighted by local pathogen prevalence
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            {rec?.duration && (
              <div className="data-row px-4">
                <span className="data-label">Treatment duration</span>
                <span className="data-value">{rec.duration}</span>
              </div>
            )}
          </div>

          {/* Allergy warning */}
          {assessment.safe === false && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl p-4 mb-4">
              <p className="text-sm font-bold text-red-900 dark:text-red-200 mb-1">Allergy Warning — Cannot Prescribe</p>
              {assessment.allergyWarnings?.map((warning, idx) => (
                <p key={idx} className="text-sm text-red-700 dark:text-red-400">{warning}</p>
              ))}
            </div>
          )}

          {/* Drug-Drug Interactions */}
          {drugInteractions.length > 0 && (
            <div className="mb-4 space-y-2">
              {drugInteractions.map((interaction, idx) => {
                const isMajor = interaction.severity === 'major';
                return (
                  <div key={idx} className={`rounded-xl p-4 border ${
                    isMajor
                      ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/40'
                      : 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/40'
                  }`}>
                    <div className="flex items-start gap-2">
                      <Zap className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isMajor ? 'text-red-600 dark:text-red-400' : 'text-orange-500 dark:text-orange-400'}`} />
                      <div>
                        <p className={`text-sm font-semibold ${isMajor ? 'text-red-900 dark:text-red-200' : 'text-orange-900 dark:text-orange-200'}`}>
                          {isMajor ? 'Major' : 'Moderate'} interaction — {interaction.withDrug?.name || interaction.withDrug?.drug}
                        </p>
                        <p className={`text-sm mt-0.5 ${isMajor ? 'text-red-700 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'}`}>
                          {interaction.effect}
                        </p>
                        <p className={`text-xs mt-1.5 font-semibold ${isMajor ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                          Action: {interaction.action}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent use warning */}
          {assessment.recentUseWarning && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">Recent Antibiotic Use</p>
              <p className="text-sm text-amber-700 dark:text-amber-400">{assessment.recentUseWarning}</p>
            </div>
          )}

          {/* Considerations */}
          {assessment.concerns?.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Considerations</p>
              <ul className="space-y-1.5">
                {assessment.concerns.map((concern, idx) => (
                  <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {concern}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Clinical rationale */}
          {rationale && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Info className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Clinical Rationale</span>
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">{rationale}</p>
            </div>
          )}
          {loadingRationale && (
            <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 mb-4">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-sm">Generating rationale…</span>
            </div>
          )}

          {/* Alternatives */}
          {rec?.alternatives?.length > 0 && (
            <div className="mb-5">
              <button
                onClick={() => setShowAlternatives(!showAlternatives)}
                className="flex items-center gap-2 text-sm font-semibold text-clinical-teal hover:text-clinical-navy dark:hover:text-white transition-colors"
              >
                {showAlternatives ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showAlternatives ? 'Hide' : 'Show'} alternatives ({rec.alternatives.length})
              </button>
              {showAlternatives && (
                <div className="mt-3 space-y-2">
                  {rec.alternatives.map((alt, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 rounded-xl p-3.5">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{alt.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{alt.dose}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold flex-shrink-0 ${
                          alt.spectrum === 'narrow'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {alt.spectrum}
                        </span>
                      </div>
                      {alt.resistanceData && (
                        <div className="mt-1.5 space-y-0.5">
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Expected coverage: <span className={
                              alt.resistanceData.expectedCoverage >= 90 ? 'text-green-500 dark:text-green-400 font-medium' :
                              alt.resistanceData.expectedCoverage >= 80 ? 'text-yellow-500 dark:text-yellow-400 font-medium' :
                              'text-red-500 dark:text-red-400 font-medium'
                            }>{alt.resistanceData.expectedCoverage}%</span>
                          </p>
                          {alt.resistanceData.pathogens?.map((p, i) => (
                            <p key={i} className="text-xs text-gray-400 dark:text-gray-600">
                              {p.pathogen}: {p.susceptibility}%
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Override form */}
          {showOverrideForm && (
            <div className="mb-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Specify Prescription Details</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Dose</label>
                  <input
                    type="text"
                    value={overrideForm.dose}
                    onChange={e => setOverrideForm(f => ({ ...f, dose: e.target.value }))}
                    placeholder="e.g. 500mg"
                    className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Frequency</label>
                  <input
                    type="text"
                    value={overrideForm.frequency}
                    onChange={e => setOverrideForm(f => ({ ...f, frequency: e.target.value }))}
                    placeholder="e.g. twice daily"
                    className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Duration</label>
                  <input
                    type="text"
                    value={overrideForm.duration}
                    onChange={e => setOverrideForm(f => ({ ...f, duration: e.target.value }))}
                    placeholder="e.g. 7 days"
                    className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleOverrideConfirm} className="btn-primary flex-1 justify-center text-sm">
                  <Check className="w-3.5 h-3.5" />
                  Confirm Override
                </button>
                <button onClick={() => setShowOverrideForm(false)} className="btn-secondary flex-1 justify-center text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!showOverrideForm && (
            <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={handlePrescribe}
                disabled={!rec?.recommendation}
                className="btn-primary flex-1 justify-center"
              >
                <Check className="w-4 h-4" />
                Accept Recommendation
              </button>
              <button
                onClick={handleOverrideClick}
                disabled={assessment?.safe === false || isRecommended()}
                className="btn-secondary flex-1 justify-center"
              >
                Override &amp; Prescribe
              </button>
            </div>
          )}
        </>
      )}

      {!selectedAntibiotic && rec?.notes && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">{rec.notes}</p>
        </div>
      )}
    </div>
  );
};

export default AntibioticRecommender;
