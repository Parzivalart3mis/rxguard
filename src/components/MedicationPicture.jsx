import React from 'react';

const MedicationPicture = ({ patient, flaggedMeds = [] }) => {
  const isFlagged = (med) => flaggedMeds.includes(med.drug);
  
  const getMedBorderClass = (med, isNew) => {
    if (isFlagged(med)) {
      return isNew ? 'border-l-4 border-l-blue-500 border-yellow-400' : 'border-l-4 border-l-red-500 border-yellow-400';
    }
    if (isNew) return 'border-l-4 border-l-blue-500';
    return 'border-l-4 border-l-green-500';
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-clinical-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        Medication Picture
      </h3>
      
      <div className="grid grid-cols-3 gap-3">
        {/* Continuing Medications */}
        <div className="space-y-2">
          <div className="bg-green-50 rounded-t-lg p-2 border-b-2 border-green-200">
            <h4 className="text-sm font-semibold text-green-800 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              CONTINUING
            </h4>
            <p className="text-xs text-green-600 mt-1">Pre-admission meds going home</p>
          </div>
          <div className="space-y-2">
            {patient.continuingMeds.map((med, idx) => (
              <div key={idx} className={`bg-white rounded-lg p-3 border shadow-sm ${getMedBorderClass(med, false)}`}>
                <div className="font-medium text-gray-900">{med.drug}</div>
                <div className="text-sm text-gray-600">{med.dose} {med.frequency}</div>
                <div className="text-xs text-gray-500 mt-1">{med.reason}</div>
                {isFlagged(med) && (
                  <div className="mt-2 text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                    ⚠️ Safety concern detected
                  </div>
                )}
              </div>
            ))}
            {patient.continuingMeds.length === 0 && (
              <div className="text-sm text-gray-400 italic p-2">No continuing medications</div>
            )}
          </div>
        </div>
        
        {/* New Medications */}
        <div className="space-y-2">
          <div className="bg-blue-50 rounded-t-lg p-2 border-b-2 border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              NEW THIS STAY
            </h4>
            <p className="text-xs text-blue-600 mt-1">Started during this admission</p>
          </div>
          <div className="space-y-2">
            {patient.newMeds.map((med, idx) => (
              <div key={idx} className={`bg-white rounded-lg p-3 border shadow-sm ${getMedBorderClass(med, true)}`}>
                <div className="font-medium text-gray-900">{med.drug}</div>
                <div className="text-sm text-gray-600">{med.dose} {med.frequency}</div>
                {med.duration && (
                  <div className="text-xs text-blue-600 mt-1">Duration: {med.duration}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">{med.reason}</div>
                {isFlagged(med) && (
                  <div className="mt-2 text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                    ⚠️ Safety concern detected
                  </div>
                )}
              </div>
            ))}
            {patient.newMeds.length === 0 && (
              <div className="text-sm text-gray-400 italic p-2">No new medications</div>
            )}
          </div>
        </div>
        
        {/* Stopped Medications */}
        <div className="space-y-2">
          <div className="bg-gray-50 rounded-t-lg p-2 border-b-2 border-gray-200">
            <h4 className="text-sm font-semibold text-gray-800 flex items-center">
              <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
              STOPPED
            </h4>
            <p className="text-xs text-gray-600 mt-1">Discontinued during admission</p>
          </div>
          <div className="space-y-2">
            {patient.stoppedMeds.map((med, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200 opacity-75">
                <div className="font-medium text-gray-500 line-through">{med.drug}</div>
                <div className="text-sm text-gray-400 line-through">{med.dose}</div>
                {med.stopReason && (
                  <div className="text-xs text-gray-500 mt-1">Stopped: {med.stopReason}</div>
                )}
              </div>
            ))}
            {patient.stoppedMeds.length === 0 && (
              <div className="text-sm text-gray-400 italic p-2">No stopped medications</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center">
          <span className="w-3 h-3 bg-green-500 rounded-sm mr-1"></span>
          <span className="text-gray-600">Continuing, no issues</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 bg-blue-500 rounded-sm mr-1"></span>
          <span className="text-gray-600">New medication</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 bg-yellow-400 rounded-sm mr-1"></span>
          <span className="text-gray-600">Flagged for review</span>
        </div>
      </div>
    </div>
  );
};

export default MedicationPicture;
