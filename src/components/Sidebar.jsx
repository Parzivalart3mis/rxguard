import {
  Shield, LayoutDashboard, FlaskConical, ClipboardList,
  UserCircle, ChevronRight, AlertTriangle, Pill, X, Menu
} from 'lucide-react';
import { usePatientContext } from '../contexts/PatientContext.jsx';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Overview & analytics',
  },
  {
    id: 'prescribe',
    label: 'Prescribe',
    icon: FlaskConical,
    description: 'Antibiotic stewardship',
  },
  {
    id: 'discharge',
    label: 'Discharge Review',
    icon: ClipboardList,
    description: 'Medication safety check',
  },
];

const WORKFLOW_STEPS = [
  { tab: 'dashboard', label: 'Select patient'   },
  { tab: 'prescribe', label: 'Prescribe'         },
  { tab: 'discharge', label: 'Safety review'     },
];

const Sidebar = ({ activeTab, onTabChange, mobileOpen, onMobileClose }) => {
  const { activeDisplay, acceptedPrescriptions, clearPatient } = usePatientContext();
  const prescription = activeDisplay ? acceptedPrescriptions[activeDisplay.name] : null;

  // Current workflow step index
  const stepIdx = WORKFLOW_STEPS.findIndex(s => s.tab === activeTab);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar panel */}
      <aside className={`
        fixed top-0 left-0 h-full z-50 flex flex-col
        w-[240px] bg-white dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-800
        transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0 lg:z-auto
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

        {/* ── Logo / Brand ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5 select-none">
            <div className="w-8 h-8 bg-clinical-teal rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight">AegisRx</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium tracking-wide">
                Safer Prescribing, Smarter Care
              </div>
            </div>
          </div>
          {/* Mobile close */}
          <button
            onClick={onMobileClose}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest px-3 mb-2">
            Workflows
          </p>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onTabChange(item.id); onMobileClose?.(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group ${
                  isActive
                    ? 'bg-clinical-teal text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-clinical-teal'}`} />
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-semibold leading-tight ${isActive ? 'text-white' : ''}`}>
                    {item.label}
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isActive ? 'text-white/70' : 'text-gray-400 dark:text-gray-600'}`}>
                    {item.description}
                  </div>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/60 flex-shrink-0" />}
              </button>
            );
          })}

          {/* Workflow progress indicator */}
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest px-3 mb-3">
              Workflow Progress
            </p>
            <div className="px-3 space-y-1.5">
              {WORKFLOW_STEPS.map((step, i) => {
                const done    = i < stepIdx;
                const current = i === stepIdx;
                return (
                  <button
                    key={step.tab}
                    onClick={() => { onTabChange(step.tab); onMobileClose?.(); }}
                    className="w-full flex items-center gap-2.5 text-left group"
                  >
                    {/* Step circle */}
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold transition-colors ${
                      done    ? 'bg-green-500 text-white' :
                      current ? 'bg-clinical-teal text-white ring-4 ring-clinical-teal/20' :
                                'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
                    }`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span className={`text-xs font-medium transition-colors ${
                      done    ? 'text-green-600 dark:text-green-400' :
                      current ? 'text-clinical-teal' :
                                'text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* ── Active Patient Card ── */}
        {activeDisplay ? (
          <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800">
            <div className="bg-clinical-teal/8 dark:bg-clinical-teal/15 border border-clinical-teal/20 dark:border-clinical-teal/30 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-clinical-teal rounded-lg flex items-center justify-center flex-shrink-0">
                    <UserCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">
                      {activeDisplay.name}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {activeDisplay.age}y · {activeDisplay.gender === 'male' ? 'Male' : activeDisplay.gender === 'female' ? 'Female' : activeDisplay.gender || '—'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearPatient}
                  title="Clear patient"
                  className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {prescription && (
                <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 rounded-lg px-2.5 py-1.5 border border-gray-100 dark:border-gray-700">
                  <Pill className="w-3 h-3 text-clinical-teal flex-shrink-0" />
                  <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 truncate">
                    Rx: {prescription.name}
                  </span>
                </div>
              )}

              <p className="text-[9px] text-clinical-teal font-semibold uppercase tracking-widest mt-2">
                Active patient
              </p>
            </div>
          </div>
        ) : (
          <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800">
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center">
              <UserCircle className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto mb-1" />
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">No patient selected</p>
              <p className="text-[9px] text-gray-300 dark:text-gray-600 mt-0.5">Go to Dashboard or Prescribe to select one</p>
            </div>
          </div>
        )}

        {/* ── Demo badge ── */}
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl px-3 py-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                For Demo Purposes Only
              </p>
              <p className="text-[9px] text-amber-600 dark:text-amber-500 leading-tight mt-0.5">
                All data is synthetic. Not for clinical use.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
