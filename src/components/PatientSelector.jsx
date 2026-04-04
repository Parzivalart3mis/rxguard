import { Search, User } from 'lucide-react';

const PatientSelector = ({ patients, selectedPatient, onSelect }) => {
  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-2">
        <User className="w-5 h-5 text-clinical-navy" />
        <label className="text-sm font-medium text-gray-700">Select Patient</label>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <select
          value={selectedPatient?.id || ''}
          onChange={(e) => {
            const patient = patients.find(p => p.id === e.target.value);
            onSelect(patient);
          }}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clinical-teal focus:border-transparent bg-white text-gray-900"
        >
          <option value="">Choose a patient...</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.name} - {patient.age}y {patient.gender === 'male' ? 'M' : 'F'} - {patient.scenario}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default PatientSelector;
