import { TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { getResistanceTrend, getSpectrumPosition } from '../services/recommendationEngine.js';

const getConditionPathogen = (cond) => {
  if (!cond) return 'E. coli';
  if (cond.includes('uti')) return 'E. coli';
  if (cond.includes('pharyngitis')) return 'GAS';
  if (cond.includes('pneumonia')) return 'S. pneumoniae';
  if (cond.includes('cellulitis')) return 'S. aureus';
  return 'E. coli';
};

const ResistanceCostVisualizer = ({ antibiotic, condition }) => {
  if (!antibiotic) return null;

  const spectrumPos = getSpectrumPosition(antibiotic);

  // Get resistance trend data
  const pathogen = getConditionPathogen(condition);
  const trendData = getResistanceTrend(antibiotic, pathogen);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-clinical-navy" />
        <h3 className="text-lg font-semibold text-gray-900">Resistance Impact</h3>
      </div>

      {/* Spectrum visualization */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-3">Antibiotic Spectrum</p>
        <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
          {/* Spectrum segments */}
          <div className="absolute left-0 top-0 h-full w-1/4 bg-green-200 flex items-center justify-center text-xs font-medium text-green-800">
            Narrow
          </div>
          <div className="absolute left-1/4 top-0 h-full w-1/4 bg-blue-200 flex items-center justify-center text-xs font-medium text-blue-800">
            Medium
          </div>
          <div className="absolute left-2/4 top-0 h-full w-1/4 bg-purple-200 flex items-center justify-center text-xs font-medium text-purple-800">
            Broad
          </div>
          <div className="absolute left-3/4 top-0 h-full w-1/4 bg-red-200 flex items-center justify-center text-xs font-medium text-red-800">
            Very Broad
          </div>
          
          {/* Current position indicator */}
          <div 
            className="absolute top-0 w-1 h-full bg-clinical-navy transition-all duration-500"
            style={{ 
              left: `${(spectrumPos.rank - 1) / 4 * 100 + 12.5}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-clinical-navy rounded-full"></div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Selected: {spectrumPos.category} spectrum
        </p>
      </div>

      {/* Resistance trend chart */}
      {trendData && trendData.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Local Resistance Trend: {pathogen}
          </p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <XAxis 
                  dataKey="year" 
                  tick={{fontSize: 10}} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{fontSize: 10}} 
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 'auto']}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip 
                  formatter={(v) => [`${v}%`, 'Resistance']}
                  labelFormatter={(l) => `Year: ${l}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="resistance" 
                  stroke="#dc2626" 
                  strokeWidth={2}
                  dot={{fill: '#dc2626', strokeWidth: 0, r: 3}}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <TrendingUp className="w-4 h-4 text-red-500" />
            <p className="text-xs text-red-600">
              Resistance has increased from {trendData[0].resistance}% to {trendData[trendData.length - 1].resistance}% over 5 years
            </p>
          </div>
        </div>
      )}

      {/* Projection card */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 mb-1">
              Stewardship Impact
            </p>
            <p className="text-sm text-amber-700">
              Broad-spectrum antibiotics like {antibiotic} accelerate resistance development. 
              Consider narrow-spectrum alternatives when clinically appropriate.
            </p>
          </div>
        </div>
      </div>

      {/* Guidelines reminder */}
      <div className="mt-4 flex items-start gap-2 text-gray-500">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p className="text-xs">
          Data based on Metro General Hospital antibiogram 2021-2025. 
          Clinical judgment should guide all prescribing decisions.
        </p>
      </div>
    </div>
  );
};

export default ResistanceCostVisualizer;
