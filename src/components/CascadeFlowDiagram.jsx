import React from 'react';

const CascadeFlowDiagram = ({ cascade }) => {
  if (!cascade || !cascade.nodes) return null;
  
  const { nodes, cascadeName, pillReduction, resolution } = cascade;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        🔗 Prescribing Cascade: {cascadeName}
      </h3>
      
      {/* Flow diagram */}
      <div className="flex flex-col items-center space-y-4">
        {nodes.map((node, idx) => (
          <React.Fragment key={node.id}>
            {/* Drug node */}
            <div className="w-full max-w-md">
              <div className={`rounded-lg border-2 p-3 ${
                node.isStarter 
                  ? 'border-orange-400 bg-orange-50' 
                  : node.isTerminal 
                    ? 'border-yellow-400 bg-yellow-50' 
                    : 'border-blue-400 bg-blue-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {node.medication.drug}
                    </div>
                    <div className="text-sm text-gray-600">
                      {node.drugClass}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {node.medication.dose} {node.medication.frequency}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {node.causes && (
                      <div className="text-xs font-medium text-red-600">
                        Causes: {node.causes}
                      </div>
                    )}
                    {node.treats && (
                      <div className="text-xs font-medium text-green-600">
                        Treats: {node.treats}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Arrow to next node */}
            {idx < nodes.length - 1 && (
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-gray-400"></div>
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <div className="text-xs text-gray-500 italic mt-1">
                  treating side effect →
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Resolution box */}
      <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="font-semibold text-green-800 mb-2">
          💡 Resolution Strategy
        </div>
        <div className="text-sm text-green-700">
          {resolution}
        </div>
        {pillReduction && (
          <div className="mt-3 flex items-center">
            <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">
              Pill burden: {pillReduction}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CascadeFlowDiagram;
