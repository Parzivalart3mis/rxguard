import { User, Calendar, Weight, AlertCircle, Pill, Beaker, Heart } from 'lucide-react';

const PatientContextCard = ({ patient }) => {
  if (!patient) {
    return (
      <div className="card p-6 h-full flex flex-col items-center justify-center text-center min-h-[200px]">
        <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
          <User className="w-7 h-7 text-gray-300 dark:text-gray-600" />
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No patient selected</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Select a patient to view clinical context</p>
      </div>
    );
  }

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="card p-0 h-full overflow-hidden">
      {/* Patient header */}
      <div className="bg-clinical-navy dark:bg-gray-900 p-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-clinical-teal rounded-xl flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white truncate">{patient.name}</h2>
            <p className="text-xs text-white/50 mt-0.5">
              {patient.age} yrs &middot; {patient.gender === 'male' ? 'Male' : 'Female'} &middot; {patient.weight} kg
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* Active Diagnoses */}
        <div>
          <div className="section-title mb-2.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Active Diagnoses
          </div>
          <div className="space-y-2">
            {patient.conditions.map((condition, idx) => (
              <div key={idx} className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-lg px-3 py-2.5">
                <p className="font-semibold text-red-900 dark:text-red-300 text-sm leading-tight">{condition.display}</p>
                <p className="text-xs text-red-500 dark:text-red-600 mt-0.5">
                  {condition.code} · {formatDate(condition.onset)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Allergies */}
        {patient.allergies?.length > 0 && (
          <div>
            <div className="section-title mb-2.5">
              <Heart className="w-3.5 h-3.5 text-red-500" />
              Allergies
            </div>
            <div className="space-y-1.5">
              {patient.allergies.map((allergy, idx) => (
                <div key={idx} className="flex items-center justify-between bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">
                  <span className="font-semibold text-red-900 dark:text-red-300 text-sm">{allergy.substance}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    allergy.criticality === 'high'
                      ? 'bg-red-200 text-red-800 dark:bg-red-800/40 dark:text-red-300'
                      : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                  }`}>
                    {allergy.criticality}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Medications */}
        {patient.currentMedications?.length > 0 && (
          <div>
            <div className="section-title mb-2.5">
              <Pill className="w-3.5 h-3.5" />
              Current Medications
            </div>
            <ul className="space-y-1.5">
              {patient.currentMedications.map((med, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="w-1 h-1 rounded-full bg-clinical-teal mt-2 flex-shrink-0" />
                  {med}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recent Labs */}
        <div>
          <div className="section-title mb-2.5">
            <Beaker className="w-3.5 h-3.5" />
            Recent Labs
          </div>
          <div className="grid grid-cols-2 gap-2">
            {patient.observations
              .filter(o =>
                o.display.includes('WBC') ||
                o.display.includes('temperature') ||
                o.display.includes('C-reactive') ||
                o.display.includes('Procalcitonin') ||
                o.display.includes('nitrites') ||
                o.display.includes('leukocyte')
              )
              .map((obs, idx) => {
                const isAbnormal =
                  (obs.display.includes('temperature') && obs.value > 38) ||
                  (obs.display.includes('WBC') && obs.value > 10) ||
                  (obs.display.includes('nitrites') && obs.value === 'positive');
                return (
                  <div key={idx} className={`rounded-lg px-3 py-2 ${
                    isAbnormal
                      ? 'bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40'
                      : 'bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50'
                  }`}>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-tight">{obs.display}</p>
                    <p className={`font-bold text-sm mt-0.5 ${
                      isAbnormal ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {obs.value}{obs.unit ? ` ${obs.unit}` : ''}
                    </p>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Past Antibiotics */}
        {patient.pastAntibiotics?.length > 0 && (
          <div>
            <div className="section-title mb-2.5">
              <Calendar className="w-3.5 h-3.5" />
              Past Antibiotics (12 mo)
            </div>
            <div className="space-y-1.5">
              {patient.pastAntibiotics.map((abx, idx) => (
                <div key={idx} className="flex justify-between items-center bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{abx.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(abx.date)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientContextCard;
