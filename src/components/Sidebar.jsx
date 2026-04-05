import {
  Shield, LayoutDashboard, FlaskConical, ClipboardList,
  UserCircle, ChevronRight, Pill, X
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
    label: 'Discharge',
    icon: ClipboardList,
    description: 'Medication safety review',
  },
];

const Sidebar = ({ activeTab, onTabChange, mobileOpen, onMobileClose }) => {
  const { activeDisplay, acceptedPrescriptions, clearPatient } = usePatientContext();
  const prescription = activeDisplay ? acceptedPrescriptions[activeDisplay.name] : null;

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
        w-64 bg-white dark:bg-[#0b1120]
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
              <div className="text-[14px] font-bold text-gray-900 dark:text-gray-100 tracking-tight">AegisRx</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide leading-tight">
                Safer Prescribing,<br />Smarter Care
              </div>
            </div>
          </div>
          {/* Mobile close */}
          <button
            onClick={onMobileClose}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-3 mb-3">
            Clinical Workflows
          </p>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onTabChange(item.id); onMobileClose?.(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group ${isActive
                  ? 'bg-clinical-teal text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-clinical-teal'}`} />
                <div className="min-w-0 flex-1">
                  <div className={`text-[13px] font-semibold leading-tight ${isActive ? 'text-white' : ''}`}>
                    {item.label}
                  </div>
                  <div className={`text-xs mt-0.5 leading-tight ${isActive ? 'text-white/70 font-medium' : 'text-slate-500 dark:text-slate-500'}`}>
                    {item.description}
                  </div>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/60 flex-shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* ── Active Patient Card ── */}
        {activeDisplay ? (
          <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 mb-2">
              Active Context
            </h4>
            <div className="bg-clinical-teal/10 dark:bg-clinical-teal/15 border border-clinical-teal/20 dark:border-clinical-teal/30 rounded-xl p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-clinical-teal rounded-lg flex items-center justify-center flex-shrink-0">
                    <UserCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">
                      {activeDisplay.name}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                      {activeDisplay.age}y · {activeDisplay.gender === 'male' ? 'Male' : activeDisplay.gender === 'female' ? 'Female' : activeDisplay.gender || '—'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearPatient}
                  title="Clear patient context"
                  className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {prescription && (
                <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800/80 rounded-md px-2 py-1.5 border border-gray-100 dark:border-gray-700/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <Pill className="w-3 h-3 text-clinical-teal flex-shrink-0" />
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate tracking-wide">
                    RX: {prescription.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0b1120]">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 mb-2">
              Active Context
            </h4>
            <div className="bg-white dark:bg-gray-800/40 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center opacity-80">
              <UserCircle className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto mb-1" />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">No patient active</p>
            </div>
          </div>
        )}

        {/* ── Demo / Info Badge ── */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50">
            <div className="flex items-center gap-2">
              <span className="text-amber-500 text-sm leading-none flex-shrink-0">⚠️</span>
              <div>
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-300 leading-tight">Demo Environment</p>
                <p className="text-[10px] text-amber-700 dark:text-amber-500 mt-0.5 leading-tight font-medium">
                  Not for clinical use
                </p>
              </div>
            </div>
          </div>
        </div>

      </aside>
    </>
  );
};

export default Sidebar;
