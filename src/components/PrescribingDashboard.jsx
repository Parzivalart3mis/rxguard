import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Legend
} from 'recharts';
import { getDashboardStats } from '../data/prescribingHistory.js';
import PatientSelector from './PatientSelector.jsx';
import {
  TrendingUp, TrendingDown, Minus, Pill, AlertTriangle, CheckCircle,
  Activity, ArrowRight
} from 'lucide-react';
import { usePatientContext } from '../contexts/PatientContext.jsx';

// Custom tooltip renderer to use CSS variables for theme support
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg shadow-lg">
        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-600 dark:text-slate-300">{entry.name}:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{entry.value}{entry.name.includes('%') || entry.dataKey === 'adherence' || entry.dataKey === 'narrowSpectrum' ? '%' : ''}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const StatCard = ({ icon, value, label, sub, subColor, SubIcon }) => (
  <div className="card p-5">
    <div className="flex items-start justify-between mb-3">
      <div className="w-9 h-9 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center border border-gray-100 dark:border-gray-700">
        {icon}
      </div>
    </div>
    <p className="text-[26px] font-bold text-gray-900 dark:text-gray-50 tabular-nums leading-none tracking-tight">
      {value}
    </p>
    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1.5 leading-tight">{label}</p>
    {sub && (
      <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${subColor}`}>
        {SubIcon && <SubIcon className="w-3 h-3" />}
        {sub}
      </div>
    )}
  </div>
);

const PrescribingDashboard = ({ onNavigate, patients, loading, onSelectPatient }) => {
  const { activePatient } = usePatientContext();
  const stats = getDashboardStats();
  const current = stats.last30Days || {
    total: 0, narrowSpectrum: { percentage: 0 }, broadSpectrum: { percentage: 0 },
    viralInfectionsWithAntibiotics: { percentage: 0, count: 0 }, adherenceRate: 0, topAntibiotics: [],
  };
  const facility = stats.facilityAverage;

  const getComparison = (user, avg) => {
    const diff = user - avg;
    if (diff < -5) return { Icon: TrendingDown, color: 'text-green-600 dark:text-green-400', text: 'Better than avg' };
    if (diff > 5) return { Icon: TrendingUp, color: 'text-red-600 dark:text-red-400', text: 'Above avg' };
    return { Icon: Minus, color: 'text-amber-600 dark:text-amber-400', text: 'On par with avg' };
  };

  const narrowCmp = getComparison(100 - (current.narrowSpectrum?.percentage || 0), 100 - facility.narrowSpectrum);
  const adherenceCmp = getComparison(current.adherenceRate || 0, facility.adherenceRate);

  return (
    <div className="min-h-full flex flex-col pb-8">
      {/* ── Hero Banner ── */}
      <div className="bg-gradient-to-br from-slate-900 to-clinical-navy dark:from-gray-950 dark:to-gray-900 text-white px-6 py-8 sm:py-10 border-b border-gray-800 shadow-sm relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-clinical-teal/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-20 w-40 h-40 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-clinical-teal/20 text-clinical-teal uppercase tracking-widest border border-clinical-teal/30">
                AegisRx
              </span>
              <span className="text-gray-400 text-xs font-medium">Antibiotic Stewardship Program</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
              Welcome back, Dr. Martinez
            </h1>
            <p className="text-slate-300 text-sm max-w-lg leading-relaxed">
              Your overall adherence to institutional prescribing guidelines is {current.adherenceRate}%. 
              Let's maintain this standard of care.
            </p>
          </div>

          {/* Quick patient start */}
          <div className="w-full md:w-80 bg-white/5 backdrop-blur-sm border border-white/10 p-3.5 rounded-xl shadow-lg">
            <label className="block text-xs font-medium text-slate-300 mb-2">Start a new workflow</label>
            <div className="flex gap-2">
              <div className="flex-1">
                {/* Custom styling applied via props down to PatientSelector isn't trivial without rewriting PatientSelector, 
                    so we will just pass it, the styles will adapt based on the wrapping container. */}
                <PatientSelector 
                  patients={patients}
                  selectedPatient={activePatient}
                  loading={loading}
                  onSelect={(p) => {
                    onSelectPatient(p);
                    if (p) onNavigate('prescribe');
                  }}
                />
              </div>
            </div>
            {!activePatient && (
              <p className="text-[10px] text-slate-400 mt-2 text-right">
                Select to jump to Prescribe →
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Analytics Overview ── */}
      <div className="page-wrapper flex-1 w-full !pt-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-clinical-teal" /> 
            30-Day Prescribing Overview
          </h2>
          <span className="text-xs font-semibold px-2 py-1 bg-gray-100 dark:bg-gray-800 text-slate-500 dark:text-slate-400 rounded-md border border-gray-200 dark:border-gray-700">
            Facility: City General
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<Pill className="w-4 h-4 text-clinical-teal" />}
            value={current.total}
            label="Total prescriptions"
            sub="Last 30 days"
            subColor="text-slate-500"
          />
          <StatCard
            icon={<CheckCircle className="w-4 h-4 text-green-500" />}
            value={`${current.narrowSpectrum?.percentage || 0}%`}
            label="Narrow-spectrum"
            sub={narrowCmp.text}
            subColor={narrowCmp.color}
            SubIcon={narrowCmp.Icon}
          />
          <StatCard
            icon={<AlertTriangle className="w-4 h-4 text-orange-500" />}
            value={`${current.broadSpectrum?.percentage || 0}%`}
            label="Broad-spectrum"
            sub={`Facility avg: ${facility.broadSpectrum}%`}
            subColor="text-slate-500"
          />
          <StatCard
            icon={<Activity className="w-4 h-4 text-clinical-teal" />}
            value={`${current.adherenceRate || 0}%`}
            label="Guideline adherence"
            sub={adherenceCmp.text}
            subColor={adherenceCmp.color}
            SubIcon={adherenceCmp.Icon}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {/* Spectrum distribution */}
          <div className="card p-5">
            <h3 className="section-title mb-4">Spectrum Distribution</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Narrow', value: current.narrowSpectrum?.count || 0 },
                      { name: 'Medium', value: current.mediumSpectrum?.count || 0 },
                      { name: 'Broad', value: current.broadSpectrum?.count || 0 },
                    ]}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="#16a34a" />
                    <Cell fill="#eab308" />
                    <Cell fill="#f97316" />
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="circle" iconSize={8}
                    formatter={(v) => <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top antibiotics */}
          <div className="card p-5">
            <h3 className="section-title mb-4">Top 5 Antibiotics</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={current.topAntibiotics || []}
                  layout="vertical"
                  margin={{ left: 0, right: 15, top: 0, bottom: 0 }}
                >
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-slate-400 dark:text-slate-500" axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: 'currentColor' }} className="text-slate-600 dark:text-slate-400 font-medium" axisLine={false} tickLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(13, 115, 119, 0.05)' }} />
                  <Bar dataKey="count" fill="#0d7377" radius={[0, 4, 4, 0]} barSize={16}>
                    {current.topAntibiotics?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#0d7377' : '#0d737799'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Monthly trend */}
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Monthly Prescribing Trends</h3>
            <span className="text-xs text-slate-500">6 month history</span>
          </div>
          <div className="h-56 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.trend} margin={{ left: -20, right: 10, top: 5, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-slate-400 dark:text-slate-500" axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: 'currentColor' }} className="text-slate-400 dark:text-slate-500"
                  axisLine={false} tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={(v) => <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{v}</span>}
                  wrapperStyle={{ paddingTop: '10px' }}
                />
                <Line
                  type="monotone" dataKey="adherence" name="Guideline Adherence"
                  stroke="#0d7377" strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0d7377', strokeWidth: 0 }}
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                />
                <Line
                  type="monotone" dataKey="narrowSpectrum" name="Narrow Spectrum %"
                  stroke="#16a34a" strokeWidth={2.5}
                  dot={{ r: 4, fill: '#16a34a', strokeWidth: 0 }}
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Viral prescribing alert */}
        {(current.viralInfectionsWithAntibiotics?.count || 0) > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-5 mb-8 animate-fade-in shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
              </div>
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-300 text-sm">
                  Practice Variation Detected
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-400/90 mt-1 leading-relaxed">
                  {current.viralInfectionsWithAntibiotics?.count || 0} prescriptions
                  ({current.viralInfectionsWithAntibiotics?.percentage || 0}%) were written for likely
                  viral respiratory tract infections in the last 30 days. Recommend watchful waiting or delayed prescribing for low bacterial
                  probability patients.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrescribingDashboard;
