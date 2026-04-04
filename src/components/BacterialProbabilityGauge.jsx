import { Activity, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { generateClinicalExplanation } from '../services/claudeApi.js';

const BacterialProbabilityGauge = ({ scoreResult, patient }) => {
  const [explanationState, setExplanationState] = useState({ text: null, forScore: null });

  useEffect(() => {
    if (!scoreResult || !patient) return;
    let ignore = false;
    generateClinicalExplanation(patient, scoreResult)
      .then(text => {
        if (!ignore) setExplanationState({ text, forScore: scoreResult });
      })
      .catch(() => {
        if (!ignore) setExplanationState({ text: null, forScore: scoreResult });
      });
    return () => { ignore = true; };
  }, [scoreResult, patient]);

  const loading = !!scoreResult && explanationState.forScore !== scoreResult;
  const explanation = explanationState.forScore === scoreResult ? explanationState.text : null;

  if (!scoreResult) return null;

  const { score, method, explanation: ruleExplanation } = scoreResult;
  
  const getColor = (s) => {
    if (s <= 25) return 'bg-clinical-green';
    if (s <= 50) return 'bg-clinical-yellow';
    if (s <= 75) return 'bg-clinical-orange';
    return 'bg-clinical-red';
  };

  const getTextColor = (s) => {
    if (s <= 25) return 'text-clinical-green';
    if (s <= 50) return 'text-clinical-yellow';
    if (s <= 75) return 'text-clinical-orange';
    return 'text-clinical-red';
  };

  const getLabel = (s) => {
    if (s <= 25) return 'Low bacterial probability';
    if (s <= 50) return 'Uncertain - consider testing';
    if (s <= 75) return 'Moderate probability - antibiotic may be warranted';
    return 'High bacterial probability - treat';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-clinical-navy" />
        <h3 className="text-lg font-semibold text-gray-900">Bacterial Probability</h3>
      </div>

      {/* Gauge */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">Score: {method}</span>
          <span className={`text-3xl font-bold ${getTextColor(score)}`}>{score}%</span>
        </div>
        
        {/* Progress bar background */}
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getColor(score)} transition-all duration-500 ease-out`}
            style={{ width: `${score}%` }}
          />
        </div>
        
        {/* Scale markers */}
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Status label */}
      <div className={`p-3 rounded-lg mb-4 ${
        score <= 25 ? 'bg-green-50 border border-green-200' :
        score <= 50 ? 'bg-yellow-50 border border-yellow-200' :
        score <= 75 ? 'bg-orange-50 border border-orange-200' :
        'bg-red-50 border border-red-200'
      }`}>
        <p className={`font-semibold ${
          score <= 25 ? 'text-green-800' :
          score <= 50 ? 'text-yellow-800' :
          score <= 75 ? 'text-orange-800' :
          'text-red-800'
        }`}>
          {getLabel(score)}
        </p>
      </div>

      {/* Clinical explanation */}
      <div className="border-t border-gray-100 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Clinical Reasoning</h4>
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Generating clinical summary...</span>
          </div>
        ) : (
          <p className="text-sm text-gray-600 leading-relaxed">
            {explanation || ruleExplanation}
          </p>
        )}
      </div>

      {/* Key indicators */}
      {scoreResult.details?.indicators && scoreResult.details.indicators.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Key Clinical Indicators</h4>
          <ul className="space-y-1">
            {scoreResult.details.indicators.map((indicator, idx) => (
              <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-clinical-teal mt-2 flex-shrink-0"></span>
                {indicator}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BacterialProbabilityGauge;
