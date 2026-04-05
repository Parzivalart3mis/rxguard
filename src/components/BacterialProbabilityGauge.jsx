import { Activity, Loader2, Brain } from 'lucide-react';
import { useEffect, useState } from 'react';
import { generateClinicalExplanation } from '../services/claudeApi.js';

const BacterialProbabilityGauge = ({ scoreResult, patient }) => {
  const [explanationState, setExplanationState] = useState({ text: null, forScore: null });

  useEffect(() => {
    if (!scoreResult || !patient) return;
    let ignore = false;
    generateClinicalExplanation(patient, scoreResult)
      .then(text => { if (!ignore) setExplanationState({ text, forScore: scoreResult }); })
      .catch(()  => { if (!ignore) setExplanationState({ text: null, forScore: scoreResult }); });
    return () => { ignore = true; };
  }, [scoreResult, patient]);

  const loading     = !!scoreResult && explanationState.forScore !== scoreResult;
  const explanation = explanationState.forScore === scoreResult ? explanationState.text : null;

  if (!scoreResult) return null;

  const { score, method, explanation: ruleExplanation } = scoreResult;

  const tier = score <= 25 ? 'low' : score <= 50 ? 'uncertain' : score <= 75 ? 'moderate' : 'high';

  const tierConfig = {
    low:      { bar: 'bg-green-500', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800/40', label: 'Low bacterial probability', sub: 'Likely viral — supportive care advised' },
    uncertain:{ bar: 'bg-yellow-400', text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-200 dark:border-yellow-800/40', label: 'Uncertain', sub: 'Consider diagnostic testing before prescribing' },
    moderate: { bar: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800/40', label: 'Moderate probability', sub: 'Antibiotic may be warranted with clinical correlation' },
    high:     { bar: 'bg-red-500',    text: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-950/30',    border: 'border-red-200 dark:border-red-800/40',    label: 'High bacterial probability', sub: 'Antibiotic treatment recommended' },
  };

  const cfg = tierConfig[tier];

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Activity className="w-4.5 h-4.5 text-clinical-teal" style={{ width: '1.125rem', height: '1.125rem' }} />
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Bacterial Probability</h3>
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 font-medium">{method}</span>
      </div>

      {/* Score + gauge */}
      <div className="mb-5">
        <div className="flex items-end justify-between mb-2.5">
          <span className={`text-4xl font-bold tabular-nums ${cfg.text}`}>{score}%</span>
          <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
            {cfg.label}
          </div>
        </div>

        {/* Track */}
        <div className="relative h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full ${cfg.bar} rounded-full transition-all duration-700 ease-out`}
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-600 mt-1.5 px-0.5">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>

      {/* Status chip */}
      <div className={`rounded-xl px-4 py-3 mb-5 border ${cfg.bg} ${cfg.border}`}>
        <p className={`text-sm font-semibold ${cfg.text}`}>{cfg.label}</p>
        <p className={`text-xs mt-0.5 opacity-80 ${cfg.text}`}>{cfg.sub}</p>
      </div>

      {/* Clinical reasoning */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <div className="flex items-center gap-2 mb-2.5">
          <Brain className="w-3.5 h-3.5 text-gray-400" />
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Clinical Reasoning
          </h4>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-sm">Generating clinical summary…</span>
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {explanation || ruleExplanation}
          </p>
        )}
      </div>

      {/* Key indicators */}
      {scoreResult.details?.indicators?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">
            Key Clinical Indicators
          </h4>
          <ul className="space-y-1.5">
            {scoreResult.details.indicators.map((indicator, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="w-1 h-1 rounded-full bg-clinical-teal mt-2 flex-shrink-0" />
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
