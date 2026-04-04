import React from 'react';

const PatientLabsCard = ({ labs }) => {
  const getEGFRColor = (egfr) => {
    if (egfr >= 90) return 'text-green-600';
    if (egfr >= 60) return 'text-yellow-600';
    if (egfr >= 30) return 'text-orange-600';
    return 'text-red-600';
  };
  
  const getPotassiumStatus = (k) => {
    if (k < 3.5) return { color: 'text-yellow-600', label: 'Low' };
    if (k > 5.0) return { color: 'text-red-600', label: 'High' };
    return { color: 'text-green-600', label: 'Normal' };
  };
  
  const potassiumStatus = getPotassiumStatus(labs.potassium);
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
        <svg className="w-5 h-5 mr-2 text-clinical-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Recent Labs
      </h3>
      
      <div className="grid grid-cols-3 gap-3">
        {/* eGFR */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">eGFR</div>
          <div className={`text-2xl font-bold ${getEGFRColor(labs.egfr)}`}>
            {labs.egfr}
          </div>
          <div className="text-xs text-gray-500">mL/min</div>
          {labs.egfr < 60 && (
            <div className="mt-1 text-xs font-medium text-orange-600">
              ⚠️ Reduced kidney function
            </div>
          )}
        </div>
        
        {/* Creatinine */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">Creatinine</div>
          <div className="text-2xl font-bold text-gray-700">
            {labs.creatinine}
          </div>
          <div className="text-xs text-gray-500">mg/dL</div>
        </div>
        
        {/* Potassium */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">Potassium</div>
          <div className={`text-2xl font-bold ${potassiumStatus.color}`}>
            {labs.potassium}
          </div>
          <div className="text-xs text-gray-500">mEq/L</div>
          {potassiumStatus.label !== 'Normal' && (
            <div className="mt-1 text-xs font-medium">
              {potassiumStatus.label}
            </div>
          )}
        </div>
        
        {/* WBC */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">WBC</div>
          <div className="text-2xl font-bold text-gray-700">
            {labs.wbc}
          </div>
          <div className="text-xs text-gray-500">×10⁹/L</div>
          {labs.wbc > 11 && (
            <div className="mt-1 text-xs font-medium text-yellow-600">
              Elevated
            </div>
          )}
        </div>
        
        {/* Hemoglobin */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">Hemoglobin</div>
          <div className="text-2xl font-bold text-gray-700">
            {labs.hemoglobin}
          </div>
          <div className="text-xs text-gray-500">g/dL</div>
        </div>
        
        {/* INR (if present) */}
        {labs.inr && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 uppercase">INR</div>
            <div className="text-2xl font-bold text-gray-700">
              {labs.inr}
            </div>
            <div className="text-xs text-gray-500">(on warfarin)</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientLabsCard;
