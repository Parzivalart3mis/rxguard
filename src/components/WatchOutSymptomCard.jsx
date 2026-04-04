import React from 'react';
import { drugSideEffects } from '../data/drugSideEffects.js';

const WatchOutSymptomCard = ({ medication }) => {
  const drugData = drugSideEffects[medication.drug];
  
  if (!drugData) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="font-semibold text-gray-800">{medication.drug}</div>
        <div className="text-sm text-gray-500 mt-1">No side effect data available</div>
      </div>
    );
  }
  
  // Categorize side effects
  const seriousSideEffects = drugData.side_effects.filter(se => 
    se.frequency === 'rare' || se.symptom.includes('angioedema') || se.symptom.includes('lactic acidosis')
  );
  
  const commonSideEffects = drugData.side_effects.filter(se => 
    se.frequency === 'very_common' || se.frequency === 'common'
  );
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-clinical-navy text-white p-3">
        <div className="font-semibold">{medication.drug}</div>
        <div className="text-sm opacity-90">{medication.dose} — {medication.reason}</div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Serious side effects */}
        <div>
          <h4 className="text-sm font-bold text-red-700 mb-2 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            CALL YOUR DOCTOR OR GO TO THE ER IF:
          </h4>
          <ul className="space-y-1">
            {seriousSideEffects.length > 0 ? (
              seriousSideEffects.slice(0, 3).map((se, idx) => (
                <li key={idx} className="text-sm text-red-600 flex items-start">
                  <span className="mr-2">•</span>
                  {se.description} (rare but serious)
                </li>
              ))
            ) : (
              <li className="text-sm text-gray-600 italic">No serious side effects typically expected</li>
            )}
          </ul>
        </div>
        
        {/* Common side effects */}
        <div>
          <h4 className="text-sm font-bold text-yellow-700 mb-2 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            THESE MAY HAPPEN AND USUALLY GO AWAY:
          </h4>
          <ul className="space-y-1">
            {commonSideEffects.slice(0, 3).map((se, idx) => (
              <li key={idx} className="text-sm text-gray-700 flex items-start">
                <span className="mr-2">•</span>
                {se.description} ({se.pct}% of people)
              </li>
            ))}
          </ul>
        </div>
        
        {/* When to call */}
        <div className="bg-blue-50 rounded-lg p-3 text-sm">
          <div className="font-semibold text-blue-800 mb-1">
            📞 When to call your doctor:
          </div>
          <ul className="text-blue-700 space-y-1">
            <li>• Side effects are severe or don't improve</li>
            <li>• You have questions about the medication</li>
            <li>• You want to stop taking it</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WatchOutSymptomCard;
