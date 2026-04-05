import { FlaskConical, AlertTriangle } from 'lucide-react';

const PatientLabsCard = ({ labs }) => {
  const getEGFRConfig = (egfr) => {
    if (egfr >= 90) return { color: 'text-green-600 dark:text-green-400', label: 'Normal', warn: false };
    if (egfr >= 60) return { color: 'text-yellow-600 dark:text-yellow-400', label: 'Mildly reduced', warn: false };
    if (egfr >= 30) return { color: 'text-orange-600 dark:text-orange-400', label: 'Moderately reduced', warn: true };
    return             { color: 'text-red-600 dark:text-red-400',    label: 'Severely reduced', warn: true };
  };

  const getPotassiumConfig = (k) => {
    if (k < 3.5) return { color: 'text-yellow-600 dark:text-yellow-400', label: 'Low', warn: true };
    if (k > 5.0) return { color: 'text-red-600 dark:text-red-400',    label: 'High', warn: true };
    return             { color: 'text-green-600 dark:text-green-400',  label: 'Normal', warn: false };
  };

  const egfrCfg = getEGFRConfig(labs.egfr);
  const kCfg    = getPotassiumConfig(labs.potassium);

  const labCells = [
    { label: 'eGFR',        value: labs.egfr,        unit: 'mL/min', color: egfrCfg.color, warn: egfrCfg.warn, warnText: egfrCfg.label },
    { label: 'Creatinine',  value: labs.creatinine,  unit: 'mg/dL',  color: 'text-gray-900 dark:text-gray-100', warn: false },
    { label: 'Potassium',   value: labs.potassium,   unit: 'mEq/L',  color: kCfg.color, warn: kCfg.warn, warnText: kCfg.label },
    { label: 'WBC',         value: labs.wbc,         unit: '×10⁹/L', color: labs.wbc > 11 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-gray-100', warn: labs.wbc > 11, warnText: 'Elevated' },
    { label: 'Hemoglobin',  value: labs.hemoglobin,  unit: 'g/dL',   color: 'text-gray-900 dark:text-gray-100', warn: false },
    ...(labs.inr ? [{ label: 'INR', value: labs.inr, unit: 'warfarin', color: 'text-gray-900 dark:text-gray-100', warn: false }] : []),
  ];

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <FlaskConical className="w-4 h-4 text-clinical-teal" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Recent Labs</h3>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {labCells.map((cell, idx) => (
          <div
            key={idx}
            className={`rounded-xl px-3 py-3 ${
              cell.warn
                ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800/40'
                : 'bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50'
            }`}
          >
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {cell.label}
            </div>
            <div className={`text-xl font-bold mt-0.5 tabular-nums ${cell.color}`}>
              {cell.value}
            </div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500">{cell.unit}</div>
            {cell.warn && cell.warnText && (
              <div className="flex items-center gap-1 mt-1">
                <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">{cell.warnText}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PatientLabsCard;
