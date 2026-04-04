import { User, Calendar, Weight, AlertCircle, Pill, Beaker } from 'lucide-react';

const PatientContextCard = ({ patient }) => {
  if (!patient) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
        <div className="text-center text-gray-500 py-8">
          <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Select a patient to view clinical context</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
        <div className="w-12 h-12 bg-clinical-navy rounded-full flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{patient.name}</h2>
          <p className="text-sm text-gray-500">
            {patient.age} years • {patient.gender === 'male' ? 'Male' : 'Female'} • {patient.weight} kg
          </p>
        </div>
      </div>

      {/* Conditions */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Active Diagnoses
        </h3>
        <div className="space-y-2">
          {patient.conditions.map((condition, idx) => (
            <div key={idx} className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <p className="font-medium text-red-900 text-sm">{condition.display}</p>
              <p className="text-xs text-red-600">ICD-10: {condition.code} • Onset: {formatDate(condition.onset)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Allergies */}
      {patient.allergies && patient.allergies.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            Allergies
          </h3>
          <div className="space-y-1">
            {patient.allergies.map((allergy, idx) => (
              <div key={idx} className="bg-red-100 border border-red-200 rounded-lg px-3 py-2">
                <p className="font-medium text-red-900 text-sm">{allergy.substance}</p>
                <p className="text-xs text-red-700">Severity: {allergy.criticality}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Medications */}
      {patient.currentMedications && patient.currentMedications.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-2">
            <Pill className="w-4 h-4" />
            Current Medications
          </h3>
          <ul className="space-y-1">
            {patient.currentMedications.map((med, idx) => (
              <li key={idx} className="text-sm text-gray-600 pl-3 border-l-2 border-gray-200">
                {med}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent Labs */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-2">
          <Beaker className="w-4 h-4" />
          Recent Labs
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {patient.observations.filter(o => 
            o.display.includes('WBC') || 
            o.display.includes('temperature') ||
            o.display.includes('C-reactive') ||
            o.display.includes('Procalcitonin') ||
            o.display.includes('nitrites') ||
            o.display.includes('leukocyte')
          ).map((obs, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500 truncate">{obs.display}</p>
              <p className={`font-semibold text-sm ${
                obs.display.includes('temperature') && obs.value > 38 ? 'text-red-600' :
                obs.display.includes('WBC') && obs.value > 10 ? 'text-red-600' :
                obs.display.includes('nitrites') && obs.value === 'positive' ? 'text-red-600' :
                'text-gray-900'
              }`}>
                {obs.value}{obs.unit ? ` ${obs.unit}` : ''}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Past Antibiotics */}
      {patient.pastAntibiotics && patient.pastAntibiotics.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Past Antibiotics (12 months)
          </h3>
          <div className="space-y-1">
            {patient.pastAntibiotics.map((abx, idx) => (
              <div key={idx} className="flex justify-between text-sm bg-amber-50 px-3 py-2 rounded-lg">
                <span className="text-gray-700">{abx.name}</span>
                <span className="text-gray-500">{formatDate(abx.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientContextCard;
