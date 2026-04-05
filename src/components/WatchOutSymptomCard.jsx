import { Phone, Info, AlertCircle } from 'lucide-react';

/**
 * Renders watch-out symptom information for a single medication.
 * Props:
 *   medication   — { drug, dose, reason }
 *   sideEffects  — { class, side_effects: [...] } | undefined
 */
const WatchOutSymptomCard = ({ medication, sideEffects }) => {
  if (!sideEffects) {
    return (
      <div className="card p-4">
        <div className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{medication.drug}</div>
        <div className="text-sm text-gray-400 dark:text-gray-500 mt-1">No side effect data available</div>
      </div>
    );
  }

  const seriousSideEffects = sideEffects.side_effects.filter(
    (se) =>
      se.frequency === 'rare' ||
      se.symptom.includes('angioedema') ||
      se.symptom.includes('lactic acidosis')
  );

  const commonSideEffects = sideEffects.side_effects.filter(
    (se) => se.frequency === 'very_common' || se.frequency === 'common'
  );

  return (
    <div className="card overflow-hidden">
      {/* Drug header */}
      <div className="bg-clinical-navy dark:bg-gray-900 px-4 py-3 border-b border-white/5">
        <div className="font-bold text-white text-sm">{medication.drug}</div>
        <div className="text-xs text-white/50 mt-0.5">{medication.dose} — {medication.reason}</div>
      </div>

      <div className="p-4 space-y-4">
        {/* Serious side effects */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            <h4 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wide">
              Call doctor or go to ER if:
            </h4>
          </div>
          <ul className="space-y-1">
            {seriousSideEffects.length > 0 ? (
              seriousSideEffects.slice(0, 3).map((se, idx) => (
                <li key={idx} className="text-xs text-red-700 dark:text-red-400 flex items-start gap-1.5">
                  <span className="mt-0.5 flex-shrink-0">•</span>
                  {se.description} <span className="text-red-400 dark:text-red-600">(rare but serious)</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-gray-400 dark:text-gray-500 italic">No serious side effects typically expected</li>
            )}
          </ul>
        </div>

        {/* Common side effects */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              May happen — usually resolves:
            </h4>
          </div>
          <ul className="space-y-1">
            {commonSideEffects.slice(0, 3).map((se, idx) => (
              <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                <span className="mt-0.5 flex-shrink-0">•</span>
                {se.description}
                <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">({se.pct}%)</span>
              </li>
            ))}
          </ul>
        </div>

        {/* When to call */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800/40 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Phone className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-blue-800 dark:text-blue-300">When to call your doctor</span>
          </div>
          <ul className="space-y-0.5">
            {['Side effects are severe or don\'t improve', 'You have questions about the medication', 'You want to stop taking it'].map((item, i) => (
              <li key={i} className="text-xs text-blue-700 dark:text-blue-400 flex items-start gap-1.5">
                <span className="mt-0.5">•</span>{item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WatchOutSymptomCard;
