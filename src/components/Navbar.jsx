import { Sun, Moon, User, Menu, Bell } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { usePatientContext } from '../contexts/PatientContext.jsx';

const Navbar = ({ pageTitle, pageSub, onMenuClick }) => {
  const { theme, toggleTheme } = useTheme();
  const { activeDisplay } = usePatientContext();

  return (
    <header className="flex-shrink-0 sticky top-0 z-30">
      {/* Accent line */}
      <div className="h-0.5 bg-gradient-to-r from-clinical-teal via-cyan-400 to-clinical-teal" />

      <div className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-4">

        {/* Mobile sidebar toggle */}
        <button
          onClick={onMenuClick}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400
                     hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-4.5 h-4.5" style={{ width: '1.125rem', height: '1.125rem' }} />
        </button>

        {/* Page title */}
        <div className="flex-1 min-w-0">
          {pageTitle && (
            <div className="flex items-baseline gap-2.5 min-w-0">
              <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">
                {pageTitle}
              </h1>
              {pageSub && (
                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline truncate">
                  {pageSub}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">

          {/* Active patient chip — visible on sm+ */}
          {activeDisplay && (
            <div className="hidden sm:flex items-center gap-2 bg-clinical-teal/8 dark:bg-clinical-teal/15
                            border border-clinical-teal/20 dark:border-clinical-teal/30
                            rounded-lg px-2.5 py-1.5 mr-1">
              <span className="w-1.5 h-1.5 rounded-full bg-clinical-teal flex-shrink-0 animate-pulse" />
              <span className="text-xs font-semibold text-clinical-teal truncate max-w-[140px]">
                {activeDisplay.name}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                {activeDisplay.age}y
              </span>
            </div>
          )}

          {/* Theme toggle — sun/moon only */}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       text-gray-500 dark:text-gray-400
                       hover:text-gray-800 dark:hover:text-gray-100
                       hover:bg-gray-100 dark:hover:bg-gray-800
                       transition-all duration-200"
          >
            {theme === 'dark'
              ? <Sun className="w-4 h-4" />
              : <Moon className="w-4 h-4" />
            }
          </button>

          {/* Notification bell (decorative in demo) */}
          <button className="relative w-8 h-8 flex items-center justify-center rounded-lg
                             text-gray-500 dark:text-gray-400
                             hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />

          {/* User avatar */}
          <div className="flex items-center gap-2.5 pl-1">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">Dr. S. Martinez</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">Internal Medicine</p>
            </div>
            <div className="relative">
              <div className="w-8 h-8 bg-clinical-teal rounded-full flex items-center justify-center shadow-sm">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full ring-2 ring-white dark:ring-gray-900" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
