import { useState } from 'react';
import { X, AlertTriangle, ChevronDown } from 'lucide-react';

const OVERRIDE_REASONS = [
  'Clinical judgment',
  'Patient preference/demand',
  'Prior treatment failure',
  'Culture results pending',
  'Allergy contraindication',
  'Drug interaction',
  'Other',
];

const OverrideModal = ({ isOpen, onClose, onConfirm, selectedAntibiotic, recommendedAntibiotic }) => {
  const [reason, setReason] = useState('');
  const [notes,  setNotes]  = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm({ reason, notes });
    setReason('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 dark:border-gray-800 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Override Recommendation</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Context */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
            Prescribing <strong>{selectedAntibiotic}</strong> instead of the recommended{' '}
            <strong>{recommendedAntibiotic}</strong>. This will be logged for stewardship review.
          </div>

          {/* Reason */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
              Override reason <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="select-base pr-10"
              >
                <option value="">Select a reason…</option>
                {OVERRIDE_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
              Additional notes <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Briefly explain your clinical reasoning…"
              rows={3}
              className="input-base resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!reason}
            className="btn-primary flex-1 justify-center bg-clinical-navy hover:bg-clinical-teal"
          >
            Confirm Override
          </button>
        </div>
      </div>
    </div>
  );
};

export default OverrideModal;
