import React from 'react';
import { Layers } from 'lucide-react';
import { getDrugDisplayName } from '../data/antibiogram.js';

const MedicationPicture = ({ patient, flaggedMeds = [] }) => {
  const isFlagged = (med) => flaggedMeds.includes(med.drug);

  const MedCard = ({ med, type }) => {
    const flagged = isFlagged(med);
    const baseClass = 'rounded-xl border p-3 text-sm transition-all';
    const typeStyles = {
      continuing: `bg-white dark:bg-gray-900 border-l-4 border-l-green-500 border-gray-100 dark:border-gray-800`,
      new:        `bg-white dark:bg-gray-900 border-l-4 border-l-blue-500 border-gray-100 dark:border-gray-800`,
      stopped:    `bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-70`,
    };
    const flagStyle = flagged ? 'ring-2 ring-amber-400 dark:ring-amber-500' : '';

    return (
      <div className={`${baseClass} ${typeStyles[type]} ${flagStyle}`}>
        <div className={`font-semibold leading-tight ${
          type === 'stopped'
            ? 'text-gray-400 dark:text-gray-500 line-through'
            : 'text-gray-900 dark:text-gray-100'
        }`}>
          {getDrugDisplayName(med.drug)}
        </div>
        <div className={`mt-0.5 ${
          type === 'stopped'
            ? 'text-gray-400 dark:text-gray-500 line-through text-xs'
            : 'text-gray-500 dark:text-gray-400 text-xs'
        }`}>
          {med.dose}{med.frequency ? ` · ${med.frequency}` : ''}
        </div>
        {type !== 'stopped' && med.reason && (
          <div className="text-xs text-gray-400 dark:text-gray-500 italic mt-0.5">
            {med.reason}
          </div>
        )}
        {type === 'continuing' && med.startDate && (
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Since {med.startDate}
          </div>
        )}
        {type === 'new' && med.duration && (
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
            {med.duration}
          </div>
        )}
        {type === 'stopped' && med.stopReason && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 no-underline not-line-through">
            Reason: {med.stopReason}
          </div>
        )}
        {med._isOverride && (
          <div className="mt-1.5 text-xs font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-1">
            ↩ Non-recommended override
          </div>
        )}
        {flagged && (
          <div className="mt-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
            ⚠ Safety concern
          </div>
        )}
      </div>
    );
  };

  const columns = [
    {
      key: 'continuing',
      label: 'CONTINUING',
      sub: 'Pre-admission meds going home',
      dot: 'bg-green-500',
      header: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/40 text-green-800 dark:text-green-300',
      meds: patient.continuingMeds,
    },
    {
      key: 'new',
      label: 'NEW THIS STAY',
      sub: 'Started during admission',
      dot: 'bg-blue-500',
      header: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/40 text-blue-800 dark:text-blue-300',
      meds: patient.newMeds,
    },
    {
      key: 'stopped',
      label: 'STOPPED',
      sub: 'Discontinued during admission',
      dot: 'bg-gray-400',
      header: 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400',
      meds: patient.stoppedMeds,
    },
  ];

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-4 h-4 text-clinical-teal" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Medication Picture</h3>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {columns.map(col => (
          <div key={col.key} className="space-y-2">
            {/* Column header */}
            <div className={`rounded-xl border px-3 py-2.5 ${col.header}`}>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dot}`} />
                <span className="text-xs font-bold tracking-wide">{col.label}</span>
                {col.meds.length > 0 && (
                  <span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/60 dark:bg-black/30 text-gray-700 dark:text-gray-300">
                    {col.meds.length}
                  </span>
                )}
              </div>
              <p className="text-xs opacity-70 mt-0.5">{col.sub}</p>
            </div>

            {/* Med cards */}
            <div className="space-y-2">
              {col.meds.map((med, idx) => (
                <MedCard key={idx} med={med} type={col.key} />
              ))}
              {col.meds.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-600 italic px-1 py-2">None</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-green-500 rounded-sm" />Continuing</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />New medication</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-400 rounded-sm ring-2 ring-amber-400" />Flagged for review</div>
      </div>
    </div>
  );
};

export default MedicationPicture;
