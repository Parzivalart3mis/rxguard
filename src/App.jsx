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
import PageHeader from './components/PageHeader.jsx';
import { FlaskConical } from 'lucide-react';

import { usePatients } from './hooks/usePatients.js';
import { calculateBacterialProbability } from './services/scoringEngine.js';
import { usePatientContext } from './contexts/PatientContext.jsx';

const PAGE_META = {
  dashboard: { title: 'Dashboard', sub: 'Overview & analytics' },
  prescribe: { title: 'Antibiotic Stewardship', sub: 'Evidence-based prescribing guidance' },
  discharge: { title: 'Discharge Safety Review', sub: 'Medication safety check before discharge' },
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

  const {
    activePatient,
    selectPatient,
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
    if (activePatient) return calculateBacterialProbability(activePatient);
    return null;
  }, [activePatient]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handlePrescribe = (data) => {
    if (activePatient) recordPrescription(activePatient.name, { ...data, isOverride: false });
    showNotification('success', `Prescription for ${data.name || data.antibiotic} recorded. Guideline-concordant prescribing noted.`);
  };

  const handleOverrideRequest = (data) => {
    setOverrideData(data);
    setShowOverrideModal(true);
    setSelectedAntibiotic(data.antibiotic);
  };

  const handleOverrideConfirm = (reasonData) => {
    setShowOverrideModal(false);
    if (activePatient && overrideData) recordPrescription(activePatient.name, { ...overrideData, isOverride: true, overrideReason: reasonData.reason, overrideNotes: reasonData.notes || null });
    showNotification('warning', `Override recorded: ${overrideData?.name || overrideData?.antibiotic} prescribed. Reason: ${reasonData.reason}`);
    setOverrideData(null);
  };

  const handleSelectPatient = async (patient) => {
    if (!patient) { selectPatient(null); return; }
    selectPatient(patient);
    const full = await getPatient(patient.id);
    if (full) selectPatient(full);
  };

  const getConditionFromScore = () => scoreResult?.condition || '';
  const prescription = activePatient ? acceptedPrescriptions[activePatient.name] : null;

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-[#09111f] overflow-hidden">

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
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

          {/* Notification banner */}
          {notification && (
            <div className={`absolute top-0 left-0 right-0 z-10 flex-shrink-0 px-6 py-2.5 border-b animate-slide-down flex items-center gap-2.5 ${notification.type === 'success'
                ? 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
              }`}>
              {notification.type === 'success'
                ? <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />}
              <p className={`text-sm font-medium ${notification.type === 'success' ? 'text-green-800 dark:text-green-300' : 'text-amber-800 dark:text-amber-300'
                }`}>
                {notification.message}
              </p>
            </div>
          )}

          {/* Page content */}
          <div className="flex-1 overflow-y-auto">

            {/* ── DASHBOARD ── */}
            {activeTab === 'dashboard' && (
              <PrescribingDashboard 
                onNavigate={setActiveTab} 
                patients={patients}
                loading={patientsLoading}
                onSelectPatient={handleSelectPatient}
              />
            )}

            {/* ── PRESCRIBE ── */}
            {activeTab === 'prescribe' && (
              <div className="page-wrapper animate-fade-in" key="prescribe-tab">
                
                <PageHeader 
                  icon={FlaskConical} 
                  title="Antibiotic Stewardship" 
                  subtitle="Select a patient then choose an antibiotic to receive guideline-based guidance."
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
                  
                  {/* Left column: Context & selection */}
                  <div className="lg:col-span-4 space-y-6">
                    {!activePatient && (
                      <div className="card p-5 animate-fade-in">
                        <label className="section-title mb-3 block">Select a Patient</label>
                        <PatientSelector
                          patients={patients}
                          selectedPatient={activePatient}
                          loading={patientsLoading}
                          onSelect={handleSelectPatient}
                        />
                      </div>
                    )}
                    {activePatient && (
                      <PatientContextCard patient={activePatient} />
                    )}
                  </div>

                  {/* Right column: Action */}
                  <div className="lg:col-span-8 space-y-6">
                    {activePatient ? (
                      <>
                        <BacterialProbabilityGauge scoreResult={scoreResult} patient={activePatient} />
                        <AntibioticRecommender
                          patient={activePatient}
                          antibiogramData={antibiogramData}
                          onPrescribe={handlePrescribe}
                          onOverride={handleOverrideRequest}
                        />
                        <ResistanceCostVisualizer
                          antibiotic={selectedAntibiotic}
                          condition={getConditionFromScore()}
                          antibiogramData={antibiogramData}
                        />

                        {/* Continue to Discharge CTA */}
                        {prescription && (
                          <div className="card p-5 border-l-4 border-clinical-teal flex items-center justify-between gap-4 animate-fade-in shadow-sm">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                Prescription recorded
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
                      <div className="card p-14 text-center animate-fade-in border-dashed border-2">
                        <div className="w-16 h-16 bg-clinical-teal/10 dark:bg-clinical-teal/20 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-clinical-teal/10">
                          <AlertCircle className="w-8 h-8 text-clinical-teal" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          No active patient context
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">
                          Please select a patient from the dropdown on the left or via the dashboard to begin prescribing.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── DISCHARGE ── */}
            {activeTab === 'discharge' && (
              <div key="discharge-tab">
                <DischargeWorkflow onNavigate={setActiveTab} />
              </div>
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
