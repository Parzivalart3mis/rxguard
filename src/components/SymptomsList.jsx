import { Heart, ArrowRight } from 'lucide-react';

const SymptomsList = ({ symptoms, onSymptomClick }) => {
  const getSeverityConfig = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'severe':   return { bg: 'bg-red-50 dark:bg-red-950/30',    border: 'border-red-200 dark:border-red-800/40',    text: 'text-red-800 dark:text-red-200',    badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' };
      case 'moderate': return { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800/40', text: 'text-amber-800 dark:text-amber-200', badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' };
      case 'mild':     return { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800/40', text: 'text-green-800 dark:text-green-200', badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' };
      default:         return { bg: 'bg-gray-50 dark:bg-gray-800/60',   border: 'border-gray-200 dark:border-gray-700',      text: 'text-gray-700 dark:text-gray-300',  badge: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-4 h-4 text-clinical-teal" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Active Symptoms</h3>
      </div>

      {symptoms.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">No active symptoms reported</p>
      ) : (
        <div className="space-y-2.5">
          {symptoms.map((symptom, idx) => {
            const cfg = getSeverityConfig(symptom.severity);
            return (
              <div
                key={idx}
                onClick={() => onSymptomClick?.(symptom)}
                className={`rounded-xl border px-4 py-3 cursor-pointer transition-all duration-150 hover:shadow-sm ${cfg.bg} ${cfg.border} ${onSymptomClick ? 'hover:scale-[1.01]' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className={`font-semibold capitalize text-sm ${cfg.text}`}>{symptom.symptom}</span>
                    {symptom.description && (
                      <p className={`text-xs mt-0.5 leading-relaxed opacity-80 ${cfg.text}`}>{symptom.description}</p>
                    )}
                    {symptom.onset && (
                      <p className={`text-[10px] mt-1 opacity-60 ${cfg.text}`}>Started {formatDate(symptom.onset)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cfg.badge}`}>
                      {symptom.severity}
                    </span>
                    {onSymptomClick && (
                      <ArrowRight className={`w-3.5 h-3.5 opacity-50 ${cfg.text}`} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SymptomsList;
