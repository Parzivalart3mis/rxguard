import React from 'react';
import { usePatientContext } from '../contexts/PatientContext.jsx';
import { UserCircle, Pill, X } from 'lucide-react';

const PageHeader = ({ icon: Icon, title, subtitle }) => {
  const { activeDisplay, acceptedPrescriptions, clearPatient } = usePatientContext();
  const prescription = activeDisplay ? acceptedPrescriptions[activeDisplay.name] : null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7 animate-fade-in">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-8 h-8 bg-clinical-teal/10 dark:bg-clinical-teal/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-clinical-teal" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 max-w-xl text-balance">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {activeDisplay && (
        <div className="flex-shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-xl px-4 py-2.5 flex items-center gap-4 shadow-sm shadow-gray-100/50 dark:shadow-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-clinical-teal rounded-lg flex items-center justify-center flex-shrink-0">
              <UserCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {activeDisplay.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeDisplay.age}y · {activeDisplay.gender === 'male' ? 'Male' : activeDisplay.gender === 'female' ? 'Female' : activeDisplay.gender || '—'}
              </p>
            </div>
          </div>
          
          {prescription && (
            <>
              <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 hidden sm:block" />
              <div className="hidden sm:flex flex-col">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest leading-tight">
                  Rx Active
                </span>
                <span className="text-xs font-semibold text-clinical-teal flex items-center gap-1 leading-snug">
                  <Pill className="w-3 h-3" />
                  {prescription.name}
                </span>
              </div>
            </>
          )}

          <button
            onClick={clearPatient}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-2"
            title="Clear patient"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default PageHeader;
