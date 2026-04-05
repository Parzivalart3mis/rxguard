import { useState, useMemo, useEffect } from 'react';
import { AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

import Navbar from './components/Navbar.jsx';
import Sidebar from './components/Sidebar.jsx';
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
import { usePatientContext } from './contexts/PatientContext.jsx';

const PAGE_META = {
  dashboard: { title: 'Dashboard',             sub: 'Overview & analytics' },
  prescribe:  { title: 'Antibiotic Stewardship', sub: 'Evidence-based prescribing guidance' },
  discharge:  { title: 'Discharge Safety Review', sub: 'Medication safety check before discharge' },
};

function App() {
  const { patients, loading: patientsLoading, getPatient } = usePatients();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedAntibiotic, setSelectedAntibiotic] = useState('');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideData, setOverrideData] = useState(null);
  const [notification, setNotification] = useState(null);
  const [antibiogramData, setAntibiogramData] = useState(null);

  // Global patient context
  const {
    prescriberPatient,
    selectPrescriberPatient,
    acceptedPrescriptions,
    recordPrescription,
  } = usePatientContext();

  useEffect(() => {
    if (!USE_BACKEND) return;
    fetch('/api/antibiogram')
      .then((r) => r.json())
      .then(setAntibiogramData)
      .catch((err) => console.error('Failed to load antibiogram:', err));
  }, []);

  const scoreResult = useMemo(() => {
    if (prescriberPatient) return calculateBacterialProbability(prescriberPatient);
    return null;
  }, [prescriberPatient]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handlePrescribe = (data) => {
    if (prescriberPatient) recordPrescription(prescriberPatient.name, data);
    showNotification('success', `Prescription for ${data.name || data.antibiotic} recorded. Guideline-concordant prescribing noted.`);
  };

  const handleOverrideRequest = (data) => {
    setOverrideData(data);
    setShowOverrideModal(true);
    setSelectedAntibiotic(data.antibiotic);
  };

  const handleOverrideConfirm = (reasonData) => {
    setShowOverrideModal(false);
    if (prescriberPatient && overrideData) recordPrescription(prescriberPatient.name, overrideData);
    showNotification('warning', `Override recorded: ${overrideData?.name || overrideData?.antibiotic} prescribed. Reason: ${reasonData.reason}`);
    setOverrideData(null);
  };

  const handleSelectPatient = async (patient) => {
    if (!patient) { selectPrescriberPatient(null); return; }
    selectPrescriberPatient(patient);
    const full = await getPatient(patient.id);
    if (full) selectPrescriberPatient(full);
  };

  const getConditionFromScore = () => scoreResult?.condition || '';
  const prescription = prescriberPatient ? acceptedPrescriptions[prescriberPatient.name] : null;

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">

      {/* ── Top Navbar ── */}
      <Navbar
        pageTitle={PAGE_META[activeTab]?.title}
        pageSub={PAGE_META[activeTab]?.sub}
        onMenuClick={() => setSidebarOpen(true)}
      />

      {/* ── Body row: sidebar + main ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Sidebar ── */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => { setActiveTab(tab); setSidebarOpen(false); }}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />

        {/* ── Main scrollable area ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Notification banner */}
          {notification && (
            <div className={`flex-shrink-0 px-6 py-2.5 border-b animate-slide-down flex items-center gap-2.5 ${
              notification.type === 'success'
                ? 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
            }`}>
              {notification.type === 'success'
                ? <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />}
              <p className={`text-sm font-medium ${
                notification.type === 'success' ? 'text-green-800 dark:text-green-300' : 'text-amber-800 dark:text-amber-300'
              }`}>
                {notification.message}
              </p>
            </div>
          )}

          {/* Page content */}
          <div className="flex-1 overflow-y-auto">

            {/* ── DASHBOARD ── */}
            {activeTab === 'dashboard' && (
              <PrescribingDashboard onNavigate={setActiveTab} />
            )}

            {/* ── PRESCRIBE ── */}
            {activeTab === 'prescribe' && (
              <div className="px-6 py-7">
                {/* Patient selector row */}
                <div className="flex items-end justify-between gap-4 flex-wrap mb-7">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
                      Antibiotic Stewardship
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Select a patient then choose an antibiotic to receive guideline-based guidance.
                    </p>
                  </div>
                  <div className="w-full sm:w-80 flex-shrink-0">
                    <PatientSelector
                      patients={patients}
                      selectedPatient={prescriberPatient}
                      loading={patientsLoading}
                      onSelect={handleSelectPatient}
                    />
                  </div>
                </div>

                {/* Prescribe grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-4">
                    <PatientContextCard patient={prescriberPatient} />
                  </div>
                  <div className="lg:col-span-8 space-y-6">
                    {prescriberPatient ? (
                      <>
                        <BacterialProbabilityGauge scoreResult={scoreResult} patient={prescriberPatient} />
                        <AntibioticRecommender
                          patient={prescriberPatient}
                          antibiogramData={antibiogramData}
                          onPrescribe={handlePrescribe}
                          onOverride={handleOverrideRequest}
                        />
                        <ResistanceCostVisualizer
                          antibiotic={selectedAntibiotic}
                          condition={getConditionFromScore()}
                          antibiogramData={antibiogramData}
                        />

                        {/* Continue to Discharge CTA (shows after Rx accepted) */}
                        {prescription && (
                          <div className="card p-5 border-l-4 border-clinical-teal flex items-center justify-between gap-4 animate-fade-in">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                Prescription recorded
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {prescription.name} · {prescription.dose} — ready for discharge safety review
                              </p>
                            </div>
                            <button
                              onClick={() => setActiveTab('discharge')}
                              className="btn-primary flex-shrink-0"
                            >
                              Discharge Review <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="card p-14 text-center animate-fade-in">
                        <div className="w-16 h-16 bg-clinical-teal/10 dark:bg-clinical-teal/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                          <AlertCircle className="w-8 h-8 text-clinical-teal" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          Select a patient to begin
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto text-sm leading-relaxed">
                          Choose a patient from the selector above to view their clinical context
                          and receive antibiotic stewardship guidance.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── DISCHARGE ── */}
            {activeTab === 'discharge' && (
              <DischargeWorkflow acceptedPrescriptions={acceptedPrescriptions} />
            )}

          </div>
        </div>
      </div>

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
