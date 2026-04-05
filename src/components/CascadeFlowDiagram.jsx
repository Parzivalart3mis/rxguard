import React from 'react';
import { Lightbulb, Pill } from 'lucide-react';

const CascadeFlowDiagram = ({ cascade }) => {
  if (!cascade || !cascade.nodes) return null;

  const { nodes, cascadeName, pillReduction, resolution } = cascade;

  const nodeStyles = (node) => {
    if (node.isStarter)  return 'border-orange-400 dark:border-orange-600 bg-orange-50 dark:bg-orange-950/30';
    if (node.isTerminal) return 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30';
    return                      'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/30';
  };

  return (
    <div className="mt-4 space-y-4">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        🔗 Cascade: {cascadeName}
      </h4>

      {/* Flow */}
      <div className="flex flex-col items-center gap-2">
        {nodes.map((node, idx) => (
          <React.Fragment key={node.id}>
            {/* Node */}
            <div className={`w-full max-w-sm rounded-xl border-2 p-3.5 ${nodeStyles(node)}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                    {node.medication.drug}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{node.drugClass}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {node.medication.dose} {node.medication.frequency}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {node.causes && (
                    <div className="text-xs font-semibold text-red-600 dark:text-red-400">
                      Causes: {node.causes}
                    </div>
                  )}
                  {node.treats && (
                    <div className="text-xs font-semibold text-green-600 dark:text-green-400">
                      Treats: {node.treats}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Arrow */}
            {idx < nodes.length - 1 && (
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
                <svg className="w-3 h-3 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">treating side effect</span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Resolution */}
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40 rounded-xl p-4">
        <div className="flex items-start gap-2 mb-2">
          <Lightbulb className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <span className="font-semibold text-green-800 dark:text-green-200 text-sm">Resolution Strategy</span>
        </div>
        <p className="text-sm text-green-700 dark:text-green-400 leading-relaxed">{resolution}</p>
        {pillReduction && (
          <div className="mt-3 flex items-center gap-2">
            <Pill className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            <span className="text-xs font-semibold text-green-700 dark:text-green-300">
              Pill burden: {pillReduction}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CascadeFlowDiagram;
