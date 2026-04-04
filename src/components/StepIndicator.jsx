import React from 'react';

const StepIndicator = ({ currentStep }) => {
  const steps = [
    { number: 1, label: 'Load Patient', description: 'Review medication picture' },
    { number: 2, label: 'Review Alerts', description: 'Safety engine running' },
    { number: 3, label: 'Resolve Alerts', description: 'Clinician actions' },
    { number: 4, label: 'Generate Discharge', description: 'Patient instructions' }
  ];
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => (
          <React.Fragment key={step.number}>
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                currentStep === step.number 
                  ? 'bg-clinical-teal text-white' 
                  : currentStep > step.number 
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
              }`}>
                {currentStep > step.number ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <div className="mt-2 text-center">
                <div className={`text-xs font-semibold ${
                  currentStep === step.number ? 'text-clinical-teal' : 'text-gray-600'
                }`}>
                  {step.label}
                </div>
                <div className="text-xs text-gray-400 hidden md:block">
                  {step.description}
                </div>
              </div>
            </div>
            
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-4 ${
                currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
              }`}></div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default StepIndicator;
