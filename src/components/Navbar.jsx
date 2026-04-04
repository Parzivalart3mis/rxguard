import { Shield, LayoutDashboard, FlaskConical, ClipboardList, User } from 'lucide-react';

const Navbar = ({ activeTab, onTabChange }) => {
  return (
    <nav className="sticky top-0 z-50 bg-clinical-navy shadow-lg">
      {/* top accent line */}
      <div className="h-0.5 bg-gradient-to-r from-clinical-teal via-cyan-400 to-clinical-teal" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div className="flex items-center gap-2.5 select-none">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-clinical-teal" />
            </div>
            <div>
              <span className="text-xl font-bold text-white tracking-tight">RxGuard</span>
              <span className="hidden sm:inline ml-2 text-xs text-white/50 font-medium">Stewardship AI</span>
            </div>
          </div>

          {/* Nav tabs */}
          <div className="flex items-center gap-1 bg-white/10 border border-white/20 rounded-xl p-1">
            {[
              { id: 'prescribe',  label: 'Prescribe',  icon: <FlaskConical className="w-3.5 h-3.5" /> },
              { id: 'discharge',  label: 'Discharge',  icon: <ClipboardList className="w-3.5 h-3.5" /> },
              { id: 'dashboard',  label: 'Dashboard',  icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
            ].map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === id
                    ? 'bg-clinical-teal text-white shadow-md'
                    : 'text-white/90 hover:text-white hover:bg-white/10'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* User */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-white leading-tight">Dr. Sarah Martinez</p>
              <p className="text-xs text-white/50">Internal Medicine</p>
            </div>
            <div className="relative">
              <div className="w-9 h-9 bg-clinical-teal rounded-full flex items-center justify-center shadow-md">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full ring-2 ring-clinical-navy" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
