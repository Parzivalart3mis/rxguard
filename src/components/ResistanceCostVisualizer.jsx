import { TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

import { getResistanceTrend as getResistanceTrendLocal, getSpectrumPosition as getSpectrumPositionLocal } from '../services/recommendationEngine.js';

const getConditionPathogen = (cond) => {
  if (!cond) return 'E. coli';
  if (cond.includes('uti'))         return 'E. coli';
  if (cond.includes('pharyngitis')) return 'GAS';
  if (cond.includes('pneumonia'))   return 'S. pneumoniae';
  if (cond.includes('cellulitis'))  return 'S. aureus';
  return 'E. coli';
};

const getSpectrumPositionFromData = (antibiotic, data) => {
  const meta = data?.antibioticMetadata?.[antibiotic];
  if (!meta) return { category: 'unknown', rank: 4 };
  return { category: meta.spectrum || 'unknown', rank: meta.spectrumRank || 4 };
};

const PATHOGEN_TO_SUFFIX = {
  'E. coli': 'ecoli', 'GAS': 'gas', 'S. pneumoniae': 'spneumo',
  'S. aureus': 'saureus', 'H. influenzae': 'hinfluenzae', 'M. catarrhalis': 'mcatarrhalis',
};

const getResistanceTrendFromData = (antibiotic, pathogenLabel, data) => {
  if (!data?.historicalResistance) return null;
  const suffix = PATHOGEN_TO_SUFFIX[pathogenLabel];
  if (suffix) {
    const direct = data.historicalResistance[`${antibiotic}_${suffix}`];
    if (direct) return direct;
  }
  const key = Object.keys(data.historicalResistance).find((k) => k.startsWith(`${antibiotic}_`));
  return key ? data.historicalResistance[key] : null;
};

const SPECTRUM_BANDS = [
  { label: 'Narrow',    color: 'bg-green-200 dark:bg-green-900/60',  text: 'text-green-800 dark:text-green-300' },
  { label: 'Medium',    color: 'bg-blue-200 dark:bg-blue-900/60',    text: 'text-blue-800 dark:text-blue-300' },
  { label: 'Broad',     color: 'bg-purple-200 dark:bg-purple-900/60',text: 'text-purple-800 dark:text-purple-300' },
  { label: 'Very Broad',color: 'bg-red-200 dark:bg-red-900/60',      text: 'text-red-800 dark:text-red-300' },
];

const ResistanceCostVisualizer = ({ antibiotic, condition, antibiogramData }) => {
  if (!antibiotic) return null;

  const pathogen = getConditionPathogen(condition);

  const spectrumPos = antibiogramData
    ? getSpectrumPositionFromData(antibiotic, antibiogramData)
    : getSpectrumPositionLocal(antibiotic);

  const trendData = antibiogramData
    ? getResistanceTrendFromData(antibiotic, pathogen, antibiogramData)
    : getResistanceTrendLocal(antibiotic, pathogen);

  const tooltipStyle = {
    backgroundColor: '#1e293b',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    color: '#f1f5f9',
    fontSize: '12px',
    padding: '8px 12px',
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp className="w-4 h-4 text-clinical-navy dark:text-clinical-teal" style={{ width: '1.125rem', height: '1.125rem' }} />
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Resistance Impact</h3>
      </div>

      {/* Spectrum bar */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">
          Antibiotic Spectrum
        </p>
        <div className="relative h-8 rounded-xl overflow-hidden flex">
          {SPECTRUM_BANDS.map((band, idx) => (
            <div
              key={idx}
              className={`flex-1 flex items-center justify-center text-xs font-semibold ${band.color} ${band.text}`}
            >
              {band.label}
            </div>
          ))}
          {/* Position indicator */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-clinical-navy dark:bg-white/80 rounded-full transition-all duration-500"
            style={{ left: `${(spectrumPos.rank - 1) / 4 * 100 + 12.5}%`, transform: 'translateX(-50%)' }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-clinical-navy dark:bg-white/80 rounded-full shadow" />
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
          Selected: <strong className="text-gray-700 dark:text-gray-300">{spectrumPos.category}</strong> spectrum
        </p>
      </div>

      {/* Resistance trend */}
      {trendData?.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Local Resistance Trend: {pathogen}
          </p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 'auto']} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [`${v}%`, 'Resistance']}
                  labelFormatter={(l) => `Year: ${l}`}
                />
                <Line
                  type="monotone" dataKey="resistance"
                  stroke="#dc2626" strokeWidth={2}
                  dot={{ fill: '#dc2626', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-red-500" />
            <p className="text-xs text-red-600 dark:text-red-400">
              Resistance: {trendData[0].resistance}% → {trendData[trendData.length - 1].resistance}% over 5 years
            </p>
          </div>
        </div>
      )}

      {/* Stewardship impact */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider mb-1">Stewardship Impact</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
              Broad-spectrum antibiotics like <strong>{antibiotic}</strong> accelerate resistance.
              Consider narrow-spectrum alternatives when clinically appropriate.
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 text-gray-400 dark:text-gray-500">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          Based on Metro General Hospital antibiogram 2021–2025.
          Clinical judgment should guide all prescribing decisions.
        </p>
      </div>
    </div>
  );
};

export default ResistanceCostVisualizer;
