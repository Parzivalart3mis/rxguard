import React from 'react';
import { Check } from 'lucide-react';

const steps = [
  { number: 1, label: 'Medication Picture',   description: 'Review medications & labs' },
  { number: 2, label: 'Safety Alerts',        description: 'Safety engine running' },
  { number: 3, label: 'Generating',           description: 'Creating instructions' },
  { number: 4, label: 'Discharge Output',     description: 'Patient instructions ready' },
];

const StepIndicator = ({ currentStep }) => (
  <div className="card px-6 py-4 mb-6">
    <div className="flex items-center">
      {steps.map((step, idx) => {
        const isComplete = currentStep > step.number;
        const isCurrent  = currentStep === step.number;
        const isPending  = currentStep < step.number;

        return (
          <React.Fragment key={step.number}>
            {/* Step node */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                isComplete
                  ? 'bg-green-500 text-white shadow-sm'
                  : isCurrent
                    ? 'bg-clinical-teal text-white shadow-sm ring-4 ring-clinical-teal/20'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
              }`}>
                {isComplete ? <Check className="w-4 h-4" /> : step.number}
              </div>
              <div className="mt-2 text-center hidden sm:block">
                <div className={`text-xs font-semibold leading-tight ${
                  isCurrent
                    ? 'text-clinical-teal'
                    : isComplete
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-400 dark:text-gray-600'
                }`}>
                  {step.label}
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5 hidden md:block">
                  {step.description}
                </div>
              </div>
            </div>

            {/* Connector */}
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 transition-all duration-500 ${
                currentStep > step.number
                  ? 'bg-green-400'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

export default StepIndicator;
