import { AlertTriangle, CheckCircle, RefreshCw, X, ShieldAlert } from 'lucide-react';

const SafetyAlertPanel = ({ alerts, onResolve, resolvedAlerts = [] }) => {
  const allAlerts = [
    ...(alerts.critical || []),
    ...(alerts.major    || []),
    ...(alerts.moderate || []),
    ...(alerts.minor    || []),
  ];

  const isResolved  = (alert) => resolvedAlerts.includes(alert.title);
  const handleResolve = (alert, action) => onResolve?.(alert, action);

  const unresolvedCritical = (alerts.critical || []).filter(a => !isResolved(a)).length;
  const totalResolved      = resolvedAlerts.length;

  const severityConfig = {
    critical: {
      bar:    'border-l-4 border-red-500',
      bg:     'bg-red-50 dark:bg-red-950/30',
      icon:   '🔴',
      badge:  'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
      title:  'text-red-900 dark:text-red-200',
      desc:   'text-red-700 dark:text-red-400',
      action: 'text-red-600 dark:text-red-400',
    },
    major: {
      bar:    'border-l-4 border-orange-500',
      bg:     'bg-orange-50 dark:bg-orange-950/30',
      icon:   '🟠',
      badge:  'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
      title:  'text-orange-900 dark:text-orange-200',
      desc:   'text-orange-700 dark:text-orange-400',
      action: 'text-orange-600 dark:text-orange-400',
    },
    moderate: {
      bar:    'border-l-4 border-yellow-500',
      bg:     'bg-yellow-50 dark:bg-yellow-950/30',
      icon:   '🟡',
      badge:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
      title:  'text-yellow-900 dark:text-yellow-200',
      desc:   'text-yellow-700 dark:text-yellow-400',
      action: 'text-yellow-600 dark:text-yellow-400',
    },
    minor: {
      bar:    'border-l-4 border-green-500',
      bg:     'bg-green-50 dark:bg-green-950/30',
      icon:   '🟢',
      badge:  'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
      title:  'text-green-900 dark:text-green-200',
      desc:   'text-green-700 dark:text-green-400',
      action: 'text-green-600 dark:text-green-400',
    },
  };

  return (
    <div className="card p-5 h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4.5 h-4.5 text-clinical-red" style={{ width: '1.125rem', height: '1.125rem' }} />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Safety Alerts</h3>
        </div>
        {allAlerts.length - totalResolved > 0 && (
          <span className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 text-xs font-bold px-2.5 py-1 rounded-full">
            {allAlerts.length - totalResolved} pending
          </span>
        )}
      </div>

      {/* Resolution progress */}
      {allAlerts.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            <span>Resolution progress</span>
            <span className="font-medium">{totalResolved} / {allAlerts.length} resolved</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${allAlerts.length > 0 ? (totalResolved / allAlerts.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Critical warning banner */}
      {unresolvedCritical > 0 && (
        <div className="bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800/60 rounded-xl p-3 mb-4 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-700 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            {unresolvedCritical} critical alert{unresolvedCritical > 1 ? 's' : ''} must be resolved before discharge
          </p>
        </div>
      )}

      {/* Alert list */}
      <div className="space-y-3">
        {allAlerts.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No safety alerts detected</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">All medications appear safe</p>
          </div>
        ) : (
          allAlerts.map((alert, idx) => {
            const cfg      = severityConfig[alert.severity] || severityConfig.minor;
            const resolved = isResolved(alert);
            return (
              <div
                key={idx}
                className={`rounded-xl overflow-hidden transition-all duration-200 ${cfg.bar} ${cfg.bg} ${resolved ? 'opacity-50' : ''}`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-base mt-0.5 flex-shrink-0">{cfg.icon}</span>
                      <div className="min-w-0">
                        <div className={`font-semibold text-sm ${cfg.title} leading-snug`}>{alert.title}</div>
                        <div className={`text-sm mt-1 leading-relaxed ${cfg.desc}`}>{alert.description}</div>
                        {alert.action && (
                          <div className={`text-xs mt-2 font-semibold ${cfg.action}`}>
                            Recommended: {alert.action}
                          </div>
                        )}
                      </div>
                    </div>
                    {resolved && (
                      <span className="flex-shrink-0 flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" /> Resolved
                      </span>
                    )}
                  </div>

                  {/* Resolution buttons */}
                  {!resolved && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-black/5 dark:border-white/5">
                      <button
                        onClick={() => handleResolve(alert, 'acknowledge')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-gray-800
                                   border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300
                                   rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <X className="w-3 h-3" /> Acknowledge
                      </button>
                      {(alert.type === 'ade' || alert.type === 'renal') && (
                        <button
                          onClick={() => handleResolve(alert, 'switch')}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                                     bg-clinical-teal text-white rounded-lg hover:bg-clinical-navy
                                     dark:hover:bg-clinical-teal-light transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" /> Switch Med
                        </button>
                      )}
                      {alert.type === 'cascade' && (
                        <button
                          onClick={() => handleResolve(alert, 'resolve')}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                                     bg-clinical-teal text-white rounded-lg hover:bg-clinical-navy
                                     transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" /> Resolve
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SafetyAlertPanel;
