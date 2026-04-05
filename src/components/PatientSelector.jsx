import { Loader2, Search, User } from 'lucide-react';

const PatientSelector = ({ patients, selectedPatient, onSelect, loading = false }) => {
  const demoPatients = patients.filter(p => p._isDemo);
  const fhirPatients = patients.filter(p => !p._isDemo);

  const formatOption = (patient) => {
    const age    = patient.age ? ` · ${patient.age}y` : '';
    const gender = patient.gender ? ` ${patient.gender === 'male' ? 'M' : 'F'}` : '';
    const scenario = patient.scenario && patient.scenario !== 'Loading...'
      ? ` — ${patient.scenario}`
      : '';
    return `${patient.name}${age}${gender}${scenario}`;
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-2">
        <User className="w-5 h-5 text-clinical-navy" />
        <label className="text-sm font-medium text-gray-700">Select Patient</label>
        {loading && (
          <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading FHIR…
          </span>
        )}
      </div>

      <div className="relative">
        {loading
          ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          : <Search  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        }
        <select
          value={selectedPatient?.id || ''}
          onChange={(e) => {
            const patient = patients.find(p => p.id === e.target.value) || null;
            onSelect(patient);
          }}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clinical-teal focus:border-transparent bg-white text-gray-900"
        >
          <option value="">Choose a patient…</option>

          {/* Demo patients — always present */}
          {demoPatients.length > 0 && (
            <optgroup label="── Demo Patients ──">
              {demoPatients.map(p => (
                <option key={p.id} value={p.id}>{formatOption(p)}</option>
              ))}
            </optgroup>
          )}

          {/* Live FHIR patients — shown when backend is active */}
          {fhirPatients.length > 0 && (
            <optgroup label="── Live FHIR Patients ──">
              {fhirPatients.map(p => (
                <option key={p.id} value={p.id}>{formatOption(p)}</option>
              ))}
            </optgroup>
          )}

          {/* While FHIR is loading, show a placeholder group */}
          {loading && fhirPatients.length === 0 && (
            <optgroup label="── Live FHIR Patients ──">
              <option disabled value="">Loading from FHIR server…</option>
            </optgroup>
          )}
        </select>
      </div>
    </div>
  );
};

export default PatientSelector;
