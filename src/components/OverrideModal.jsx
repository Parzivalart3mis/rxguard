import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const OVERRIDE_REASONS = [
  'Clinical judgment',
  'Patient preference/demand',
  'Prior treatment failure',
  'Culture results pending',
  'Allergy contraindication',
  'Drug interaction',
  'Other'
];

const OverrideModal = ({ isOpen, onClose, onConfirm, selectedAntibiotic, recommendedAntibiotic }) => {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm({
      reason,
      notes
    });
    setReason('');
    setNotes('');
  };

  const canSubmit = reason !== '';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-gray-900">Override Recommendation</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          You are choosing to prescribe <strong>{selectedAntibiotic}</strong> instead of the 
          recommended <strong>{recommendedAntibiotic}</strong>. This will be logged for stewardship review.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Override reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clinical-teal focus:border-transparent"
            >
              <option value="">Select a reason...</option>
              {OVERRIDE_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Additional notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Briefly explain your clinical reasoning..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clinical-teal focus:border-transparent resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="flex-1 py-2 px-4 bg-clinical-navy text-white rounded-lg font-medium hover:bg-clinical-teal disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Confirm Override
          </button>
        </div>
      </div>
    </div>
  );
};

export default OverrideModal;
