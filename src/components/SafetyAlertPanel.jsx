
const SafetyAlertPanel = ({ alerts, onResolve, resolvedAlerts = [] }) => {
  
  const allAlerts = [
    ...(alerts.critical || []),
    ...(alerts.major || []),
    ...(alerts.moderate || []),
    ...(alerts.minor || [])
  ];
  
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'major': return '🟠';
      case 'moderate': return '🟡';
      case 'minor': return '🟢';
      default: return 'ℹ️';
    }
  };
  
  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'critical': return 'border-l-4 border-red-500 bg-red-50';
      case 'major': return 'border-l-4 border-orange-500 bg-orange-50';
      case 'moderate': return 'border-l-4 border-yellow-500 bg-yellow-50';
      case 'minor': return 'border-l-4 border-green-500 bg-green-50';
      default: return 'border-l-4 border-gray-500 bg-gray-50';
    }
  };
  
  const isResolved = (alert) => resolvedAlerts.includes(alert.title);
  
  const handleResolve = (alert, action) => {
    onResolve && onResolve(alert, action);
  };
  
  const unresolvedCritical = (alerts.critical || []).filter(a => !isResolved(a)).length;
  const totalUnresolved = allAlerts.filter(a => !isResolved(a)).length;
  const totalResolved = resolvedAlerts.length;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full">
      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center justify-between">
        <span className="flex items-center">
          <svg className="w-5 h-5 mr-2 text-clinical-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Safety Alerts
        </span>
        {totalUnresolved > 0 && (
          <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full">
            {totalUnresolved} pending
          </span>
        )}
      </h3>
      
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Alert Resolution Progress</span>
          <span>{totalResolved} of {allAlerts.length} resolved</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${allAlerts.length > 0 ? (totalResolved / allAlerts.length) * 100 : 0}%` }}
          ></div>
        </div>
      </div>
      
      {/* Critical warning */}
      {unresolvedCritical > 0 && (
        <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
          <div className="flex items-center text-red-800 font-semibold">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {unresolvedCritical} critical alert{unresolvedCritical > 1 ? 's' : ''} must be resolved before discharge
          </div>
        </div>
      )}
      
      {/* Alert list */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {allAlerts.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <svg className="w-12 h-12 mx-auto text-green-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No safety alerts detected</p>
            <p className="text-sm text-gray-400 mt-1">All medications appear safe</p>
          </div>
        ) : (
          allAlerts.map((alert, idx) => (
            <div 
              key={idx}
              className={`rounded-lg p-3 ${getSeverityClass(alert.severity)} ${isResolved(alert) ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <span className="text-lg mr-2">{getSeverityIcon(alert.severity)}</span>
                  <div>
                    <div className="font-semibold text-gray-900">{alert.title}</div>
                    <div className="text-sm text-gray-700 mt-1">{alert.description}</div>
                    {alert.action && (
                      <div className="text-sm font-medium text-gray-800 mt-2">
                        💡 {alert.action}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Resolution buttons */}
              {!isResolved(alert) ? (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleResolve(alert, 'acknowledge')}
                    className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Acknowledge
                  </button>
                  {(alert.type === 'ade' || alert.type === 'renal') && (
                    <button
                      onClick={() => handleResolve(alert, 'switch')}
                      className="px-3 py-1 text-xs bg-clinical-teal text-white rounded hover:bg-clinical-navy"
                    >
                      Switch Med
                    </button>
                  )}
                  {alert.type === 'cascade' && (
                    <button
                      onClick={() => handleResolve(alert, 'resolve')}
                      className="px-3 py-1 text-xs bg-clinical-teal text-white rounded hover:bg-clinical-navy"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-2 text-sm text-green-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Resolved
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SafetyAlertPanel;
