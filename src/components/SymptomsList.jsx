import React from 'react';

const SymptomsList = ({ symptoms, onSymptomClick }) => {
  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'severe':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'moderate':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'mild':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
        <svg className="w-5 h-5 mr-2 text-clinical-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        Active Symptoms
      </h3>
      
      {symptoms.length === 0 ? (
        <div className="text-gray-500 italic">No active symptoms reported</div>
      ) : (
        <div className="space-y-2">
          {symptoms.map((symptom, idx) => (
            <div 
              key={idx}
              onClick={() => onSymptomClick && onSymptomClick(symptom)}
              className={`rounded-lg border p-3 cursor-pointer hover:shadow-md transition-shadow ${getSeverityColor(symptom.severity)}`}
            >
              <div className="flex justify-between items-start">
                <div className="font-medium capitalize">{symptom.symptom}</div>
                <div className="text-xs uppercase font-semibold opacity-75">
                  {symptom.severity}
                </div>
              </div>
              
              <div className="text-sm mt-1 opacity-90">{symptom.description}</div>
              
              <div className="flex justify-between items-center mt-2 text-xs opacity-75">
                <span>Started: {formatDate(symptom.onset)}</span>
                {onSymptomClick && (
                  <span className="underline cursor-pointer">Check drug causes →</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SymptomsList;
