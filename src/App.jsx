import { useState, useMemo, useEffect } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

import Navbar from './components/Navbar.jsx';
import PatientSelector from './components/PatientSelector.jsx';
import PatientContextCard from './components/PatientContextCard.jsx';
import BacterialProbabilityGauge from './components/BacterialProbabilityGauge.jsx';
import AntibioticRecommender from './components/AntibioticRecommender.jsx';
import ResistanceCostVisualizer from './components/ResistanceCostVisualizer.jsx';
import PrescribingDashboard from './components/PrescribingDashboard.jsx';
import OverrideModal from './components/OverrideModal.jsx';
import DischargeWorkflow from './components/DischargeWorkflow.jsx';

import { usePatients } from './hooks/usePatients.js';
import { calculateBacterialProbability } from './services/scoringEngine.js';

function App() {
  const { patients, loading: patientsLoading, getPatient } = usePatients();
  const [activeTab, setActiveTab] = useState('prescribe');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedAntibiotic, setSelectedAntibiotic] = useState('');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideData, setOverrideData] = useState(null);
  const [notification, setNotification] = useState(null);
  const [antibiogramData, setAntibiogramData] = useState(null);
  // Prescriptions accepted in the Prescribe tab, keyed by patient name
  const [acceptedPrescriptions, setAcceptedPrescriptions] = useState({});

  // Fetch antibiogram metadata once on mount when backend mode is active
  useEffect(() => {
    if (!USE_BACKEND) return;
    fetch('/api/antibiogram')
      .then((r) => r.json())
      .then(setAntibiogramData)
      .catch((err) => console.error('Failed to load antibiogram data:', err));
  }, []);

  const scoreResult = useMemo(() => {
    if (selectedPatient) return calculateBacterialProbability(selectedPatient);
    return null;
  }, [selectedPatient]);

  const handlePrescribe = (data) => {
    if (selectedPatient) {
      setAcceptedPrescriptions(prev => ({
        ...prev,
        [selectedPatient.name]: {
          antibiotic: data.antibiotic,
          name: data.name || data.antibiotic,
          dose: data.dose || 'as prescribed',
          date: new Date().toISOString().split('T')[0],
        },
      }));
    }
    setNotification({
      type: 'success',
      message: `Prescription for ${data.name || data.antibiotic} recorded. Guideline-concordant prescribing noted.`
    });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleOverrideRequest = (data) => {
    setOverrideData(data);
    setShowOverrideModal(true);
    setSelectedAntibiotic(data.antibiotic);
  };

  const handleOverrideConfirm = (reasonData) => {
    setShowOverrideModal(false);
    if (selectedPatient && overrideData) {
      setAcceptedPrescriptions(prev => ({
        ...prev,
        [selectedPatient.name]: {
          antibiotic: overrideData.antibiotic,
          name: overrideData.name || overrideData.antibiotic,
          dose: overrideData.dose || 'as prescribed',
          date: new Date().toISOString().split('T')[0],
        },
      }));
    }
    setNotification({
      type: 'warning',
      message: `Override recorded: ${overrideData?.name || overrideData?.antibiotic} prescribed. Reason: ${reasonData.reason}`
    });
    setOverrideData(null);
    setTimeout(() => setNotification(null), 5000);
  };

  const getConditionFromScore = () => scoreResult?.condition || '';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Notification Banner */}
      {notification && (
        <div className={`px-4 py-3 border-b ${
          notification.type === 'success' ? 'bg-green-100 border-green-200' : 'bg-amber-100 border-amber-200'
        }`}>
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            {notification.type === 'success'
              ? <CheckCircle className="w-5 h-5 text-green-600" />
              : <AlertCircle className="w-5 h-5 text-amber-600" />
            }
            <p className={`text-sm ${notification.type === 'success' ? 'text-green-800' : 'text-amber-800'}`}>
              {notification.message}
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {activeTab === 'prescribe' ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6 max-w-md">
            <PatientSelector
              patients={patients}
              selectedPatient={selectedPatient}
              loading={patientsLoading}
              onSelect={async (patient) => {
                if (!patient) { setSelectedPatient(null); return; }
                // Show the stub immediately so the UI isn't blank, then load full detail
                setSelectedPatient(patient);
                const full = await getPatient(patient.id);
                if (full) setSelectedPatient(full);
              }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4">
              <PatientContextCard patient={selectedPatient} />
            </div>

            <div className="lg:col-span-8 space-y-6">
              {selectedPatient ? (
                <>
                  <BacterialProbabilityGauge scoreResult={scoreResult} patient={selectedPatient} />
                  <AntibioticRecommender
                    patient={selectedPatient}
                    antibiogramData={antibiogramData}
                    onPrescribe={handlePrescribe}
                    onOverride={handleOverrideRequest}
                  />
                  <ResistanceCostVisualizer
                    antibiotic={selectedAntibiotic}
                    condition={getConditionFromScore()}
                    antibiogramData={antibiogramData}
                  />
                </>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a patient to begin</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Choose a patient from the dropdown above to view their clinical context and receive antibiotic stewardship guidance.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      ) : activeTab === 'discharge' ? (
        <DischargeWorkflow acceptedPrescriptions={acceptedPrescriptions} />
      ) : (
        <PrescribingDashboard />
      )}

      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs text-gray-500 text-center">
            <strong>Disclaimer:</strong> RxGuard is a clinical decision-support tool for educational and demonstration purposes only.
            It does not replace clinical judgment. All patient data shown is synthetic. Not for use in actual clinical care.
          </p>
        </div>
      </footer>

      <OverrideModal
        isOpen={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        onConfirm={handleOverrideConfirm}
        selectedAntibiotic={overrideData?.antibiotic || ''}
        recommendedAntibiotic={overrideData?.recommended || ''}
      />
    </div>
  );
}

export default App;
