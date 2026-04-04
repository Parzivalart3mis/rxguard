import { useState, useEffect, useMemo } from 'react';
import { Pill, AlertTriangle, Check, ChevronDown, ChevronUp, Loader2, ShieldOff, Zap } from 'lucide-react';
import { getRecommendation } from '../services/recommendationEngine.js';
import { antibioticMetadata } from '../data/antibiogram.js';
import { generateRecommendationRationale, generateSuboptimalReasoning } from '../services/claudeApi.js';
import { checkDrugInteractions } from '../services/interactionChecker.js';

const AVAILABLE_ANTIBIOTICS = Object.keys(antibioticMetadata);

const AntibioticRecommender = ({ patient, onPrescribe, onOverride }) => {
  const [selectedAntibiotic, setSelectedAntibiotic] = useState('');
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [rationaleState, setRationaleState] = useState({ text: null, forAntibiotic: null });
  const [suboptimalState, setSuboptimalState] = useState({ text: null, forAntibiotic: null });

  // Base recommendation (no antibiotic selected) — used to detect viral/no-antibiotic conditions
  const baseRecommendation = useMemo(() => {
    if (patient) return getRecommendation(patient);
    return null;
  }, [patient]);

  const isViralCondition = baseRecommendation && !baseRecommendation.recommendation &&
    baseRecommendation.conditionName;

  const recommendation = useMemo(() => {
    if (patient && selectedAntibiotic) return getRecommendation(patient, selectedAntibiotic);
    return null;
  }, [patient, selectedAntibiotic]);

  useEffect(() => {
    if (!recommendation?.recommendation || !patient) return;
    let ignore = false;
    generateRecommendationRationale(patient, recommendation.recommendation, selectedAntibiotic)
      .then(text => {
        if (!ignore) setRationaleState({ text, forAntibiotic: selectedAntibiotic });
      })
      .catch(() => {
        if (!ignore) setRationaleState({ text: null, forAntibiotic: selectedAntibiotic });
      });
    return () => { ignore = true; };
  }, [recommendation, patient, selectedAntibiotic]);

  const rationale = rationaleState.forAntibiotic === selectedAntibiotic ? rationaleState.text : null;
  const loadingRationale = !!recommendation?.recommendation && rationaleState.forAntibiotic !== selectedAntibiotic;

  const drugInteractions = useMemo(() => {
    if (!selectedAntibiotic || !patient?.currentMedicationDrugs?.length) return [];
    return checkDrugInteractions(
      { drug: selectedAntibiotic },
      patient.currentMedicationDrugs
    );
  }, [selectedAntibiotic, patient]);

  const isNotRecommended = recommendation?.recommendation &&
    selectedAntibiotic &&
    selectedAntibiotic !== recommendation.recommendation.antibiotic;

  useEffect(() => {
    const selectedAssessment = recommendation?.selectedAntibiotic;
    if (!isNotRecommended || !recommendation?.recommendation || !selectedAssessment) return;
    let ignore = false;
    const selectedMeta = { name: antibioticMetadata[selectedAntibiotic]?.name || selectedAntibiotic, spectrum: selectedAssessment.spectrum };
    generateSuboptimalReasoning(patient, selectedMeta, selectedAssessment, recommendation.recommendation)
      .then(text => {
        if (!ignore) setSuboptimalState({ text, forAntibiotic: selectedAntibiotic });
      })
      .catch(() => {
        if (!ignore) setSuboptimalState({ text: null, forAntibiotic: selectedAntibiotic });
      });
    return () => { ignore = true; };
  }, [isNotRecommended, recommendation, patient, selectedAntibiotic]);

  const suboptimalText = suboptimalState.forAntibiotic === selectedAntibiotic ? suboptimalState.text : null;
  const loadingSuboptimal = isNotRecommended && suboptimalState.forAntibiotic !== selectedAntibiotic;

  if (!patient) return null;

  const handlePrescribe = () => {
    if (recommendation?.recommendation) {
      onPrescribe({
        antibiotic: recommendation.recommendation.antibiotic,
        followedRecommendation: true
      });
    }
  };

  const handleOverride = () => {
    onOverride({
      antibiotic: selectedAntibiotic,
      recommended: recommendation?.recommendation?.antibiotic
    });
  };

  const isRecommended = () => {
    if (!recommendation || !selectedAntibiotic) return false;
    if (!recommendation.recommendation) return false;
    return selectedAntibiotic === recommendation.recommendation.antibiotic;
  };

  const getSelectedAssessment = () => {
    if (!recommendation?.selectedAntibiotic) return null;
    return recommendation.selectedAntibiotic;
  };

  const assessment = getSelectedAssessment();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Pill className="w-5 h-5 text-clinical-navy" />
        <h3 className="text-lg font-semibold text-gray-900">Antibiotic Selection</h3>
      </div>

      {/* Viral / No Antibiotic Banner */}
      {isViralCondition && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <ShieldOff className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800 text-sm">Antibiotic not recommended</p>
            <p className="text-sm text-blue-700 mt-0.5">
              {baseRecommendation.conditionName} is likely viral.{' '}
              {baseRecommendation.notes || 'Supportive care is advised.'}
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
              {antibioticMetadata[abx].name}
            </option>
          ))}
        </select>
      </div>

      {selectedAntibiotic && assessment && (
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
                <p className={`font-semibold ${
                  isRecommended() ? 'text-green-800' : 'text-amber-800'
                }`}>
                  {isRecommended() 
                    ? 'This is the recommended first-line option'
                    : 'A better alternative may be available'
                  }
                </p>
                {!isRecommended() && recommendation?.recommendation && (
                  <p className="text-sm text-amber-700 mt-1">
                    Consider {recommendation.recommendation.name} instead
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
            {recommendation?.duration && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Treatment duration</span>
                <span className="text-sm font-medium text-gray-900">{recommendation.duration}</span>
              </div>
            )}
          </div>

          {/* Warnings */}
          {assessment.allergyWarnings.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm font-semibold text-red-800 mb-1">Allergy Warning</p>
              {assessment.allergyWarnings.map((warning, idx) => (
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
                      isMajor
                        ? 'bg-red-50 border-red-300'
                        : 'bg-orange-50 border-orange-200'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <Zap className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isMajor ? 'text-red-600' : 'text-orange-500'}`} />
                      <div>
                        <p className={`text-sm font-semibold ${isMajor ? 'text-red-800' : 'text-orange-800'}`}>
                          {isMajor ? 'Major' : 'Moderate'} Drug Interaction — {interaction.withDrug.name}
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

          {assessment.concerns.length > 0 && (
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
          {recommendation?.alternatives && recommendation.alternatives.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => setShowAlternatives(!showAlternatives)}
                className="flex items-center gap-2 text-sm font-medium text-clinical-teal hover:text-clinical-navy"
              >
                {showAlternatives ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showAlternatives ? 'Hide' : 'Show'} alternative options ({recommendation.alternatives.length})
              </button>
              
              {showAlternatives && (
                <div className="mt-2 space-y-2">
                  {recommendation.alternatives.map((alt, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{alt.name}</p>
                          <p className="text-sm text-gray-600">{alt.dose}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          alt.spectrum === 'narrow' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
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
              disabled={assessment.allergyWarnings.length > 0}
              className="flex-1 bg-clinical-teal text-white py-2 px-4 rounded-lg font-medium hover:bg-clinical-navy disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Accept Recommendation
            </button>
            <button
              onClick={handleOverride}
              disabled={isRecommended()}
              className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Override & Prescribe Selected
            </button>
          </div>
        </>
      )}

      {!selectedAntibiotic && recommendation?.notes && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">{recommendation.notes}</p>
        </div>
      )}
    </div>
  );
};

export default AntibioticRecommender;
