import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import { getDashboardStats } from '../data/prescribingHistory.js';
import {
  TrendingUp, TrendingDown, Minus, Pill, AlertTriangle, CheckCircle,
  FlaskConical, ClipboardList, Activity, ArrowRight, UserCircle, Stethoscope
} from 'lucide-react';
import { usePatientContext } from '../contexts/PatientContext.jsx';

const CHART_COLORS = ['#16a34a', '#eab308', '#f97316', '#dc2626', '#8b5cf6'];

const TooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '10px',
  color: '#f1f5f9',
  fontSize: '12px',
  padding: '8px 12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
};

/* ── Stat card ─────────────────────────────────────────── */
const StatCard = ({ icon, value, label, sub, subColor, SubIcon }) => (
  <div className="card p-5">
    <div className="flex items-start justify-between mb-3">
      <div className="w-9 h-9 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center">
        {icon}
      </div>
    </div>
    <p className="text-[26px] font-bold text-gray-900 dark:text-gray-50 tabular-nums leading-none tracking-tight">
      {value}
    </p>
    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-tight">{label}</p>
    {sub && (
      <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${subColor}`}>
        {SubIcon && <SubIcon className="w-3 h-3" />}
        {sub}
      </div>
    )}
  </div>
);

/* ── CTA card ───────────────────────────────────────────── */
const CtaCard = ({ icon: Icon, title, sub, onClick, variant = 'primary' }) => (
  <button
    onClick={onClick}
    className={`w-full text-left rounded-2xl p-4 border transition-all duration-150 hover:shadow-md active:scale-[0.99] group ${
      variant === 'primary'
        ? 'bg-clinical-teal border-clinical-teal text-white shadow-sm'
        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-clinical-teal/40'
    }`}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          variant === 'primary'
            ? 'bg-white/20'
            : 'bg-clinical-teal/10 dark:bg-clinical-teal/20'
        }`}>
          <Icon className={`w-4.5 h-4.5 ${variant === 'primary' ? 'text-white' : 'text-clinical-teal'}`}
            style={{ width: '1.125rem', height: '1.125rem' }} />
        </div>
        <div>
          <p className={`text-sm font-bold leading-tight ${
            variant === 'primary' ? 'text-white' : 'text-gray-900 dark:text-gray-100'
          }`}>{title}</p>
          <p className={`text-xs mt-0.5 ${
            variant === 'primary' ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
          }`}>{sub}</p>
        </div>
      </div>
      <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
        variant === 'primary' ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'
      }`} />
    </div>
  </button>
);

/* ── Main component ────────────────────────────────────── */
const PrescribingDashboard = ({ onNavigate }) => {
  const { activeDisplay, acceptedPrescriptions } = usePatientContext();
  const stats   = getDashboardStats();
  const current = stats.last30Days || {
    total: 0,
    narrowSpectrum: { percentage: 0 },
    broadSpectrum: { percentage: 0 },
    viralInfectionsWithAntibiotics: { percentage: 0 },
    adherenceRate: 0,
    topAntibiotics: [],
  };
  const facility = stats.facilityAverage;

  const getComparison = (user, avg) => {
    const diff = user - avg;
    if (diff < -5) return { Icon: TrendingDown, color: 'text-green-600 dark:text-green-400', text: 'Better than avg' };
    if (diff > 5)  return { Icon: TrendingUp,   color: 'text-red-600 dark:text-red-400',    text: 'Above avg' };
    return           { Icon: Minus,         color: 'text-yellow-600 dark:text-yellow-400', text: 'On par with avg' };
  };

  const narrowCmp    = getComparison(100 - (current.narrowSpectrum?.percentage || 0), 100 - facility.narrowSpectrum);
  const adherenceCmp = getComparison(current.adherenceRate || 0, facility.adherenceRate);

  const prescription = activeDisplay ? acceptedPrescriptions[activeDisplay.name] : null;

  return (
    <div className="min-h-full">

      {/* ── Hero banner ──────────────────────────────────────── */}
      <div className="bg-clinical-navy dark:bg-gray-950 border-b border-white/5">
        <div className="px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8">

            {/* Left — brand + value prop */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-clinical-teal uppercase tracking-widest">Clinical Decision Support</span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">
                Safer Prescribing.<br className="hidden sm:block" /> Smarter Care.
              </h1>
              <p className="text-white/55 text-sm mt-2.5 max-w-md leading-relaxed">
                Real-time antibiotic stewardship, ADE detection, prescribing cascade analysis,
                and IDSA guideline concordance — all in one platform.
              </p>

              {/* Active patient inline */}
              {activeDisplay ? (
                <div className="mt-4 flex items-center gap-3 bg-white/8 border border-white/12 rounded-xl px-3.5 py-2.5 w-fit">
                  <div className="w-7 h-7 bg-clinical-teal rounded-lg flex items-center justify-center flex-shrink-0">
                    <UserCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold leading-tight">{activeDisplay.name}</p>
                    <p className="text-white/45 text-[10px]">
                      {activeDisplay.age}y · Active patient
                      {prescription ? ` · Rx: ${prescription.name}` : ''}
                    </p>
                  </div>
                  {prescription && (
                    <button
                      onClick={() => onNavigate('discharge')}
                      className="ml-2 flex items-center gap-1.5 text-xs font-semibold text-clinical-teal hover:text-white transition-colors"
                    >
                      Safety review <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 w-fit">
                  <Stethoscope className="w-4 h-4 text-white/30" />
                  <p className="text-white/40 text-xs">No patient selected — go to Prescribe or Discharge to begin</p>
                </div>
              )}
            </div>

            {/* Right — quick action cards */}
            <div className="flex flex-col gap-2.5 lg:w-72 flex-shrink-0">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Quick Actions</p>
              <CtaCard
                icon={FlaskConical}
                title="Antibiotic Stewardship"
                sub="Guideline-concordant prescribing"
                onClick={() => onNavigate('prescribe')}
                variant="primary"
              />
              <CtaCard
                icon={ClipboardList}
                title="Discharge Safety Review"
                sub="ADE, cascade & interaction checks"
                onClick={() => onNavigate('discharge')}
                variant="secondary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Analytics body ───────────────────────────────────── */}
      <div className="px-6 py-7 space-y-7">

        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">Prescribing Analytics</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Antibiotic stewardship metrics — last 30 days</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Pill className="w-4.5 h-4.5 text-clinical-teal" style={{ width: '1.125rem', height: '1.125rem' }} />}
            value={current.total}
            label="Total prescriptions"
            sub="Last 30 days"
            subColor="text-gray-400 dark:text-gray-500"
          />
          <StatCard
            icon={<CheckCircle className="w-4.5 h-4.5 text-green-500" style={{ width: '1.125rem', height: '1.125rem' }} />}
            value={`${current.narrowSpectrum?.percentage || 0}%`}
            label="Narrow-spectrum rate"
            sub={narrowCmp.text}
            subColor={narrowCmp.color}
            SubIcon={narrowCmp.Icon}
          />
          <StatCard
            icon={<AlertTriangle className="w-4.5 h-4.5 text-orange-500" style={{ width: '1.125rem', height: '1.125rem' }} />}
            value={`${current.broadSpectrum?.percentage || 0}%`}
            label="Broad-spectrum rate"
            sub={`Facility avg: ${facility.broadSpectrum}%`}
            subColor="text-gray-400 dark:text-gray-500"
          />
          <StatCard
            icon={<Activity className="w-4.5 h-4.5 text-clinical-teal" style={{ width: '1.125rem', height: '1.125rem' }} />}
            value={`${current.adherenceRate || 0}%`}
            label="Guideline adherence"
            sub={adherenceCmp.text}
            subColor={adherenceCmp.color}
            SubIcon={adherenceCmp.Icon}
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Spectrum distribution */}
          <div className="card p-5">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Spectrum Distribution</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 mb-4">Prescriptions by spectrum class</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Narrow', value: current.narrowSpectrum?.count  || 0 },
                      { name: 'Medium', value: current.mediumSpectrum?.count  || 0 },
                      { name: 'Broad',  value: current.broadSpectrum?.count   || 0 },
                    ]}
                    cx="50%" cy="50%"
                    innerRadius={52} outerRadius={76}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    <Cell fill="#16a34a" />
                    <Cell fill="#eab308" />
                    <Cell fill="#f97316" />
                  </Pie>
                  <Tooltip contentStyle={TooltipStyle} />
                  <Legend
                    iconType="circle" iconSize={7}
                    formatter={(v) => <span className="text-xs text-gray-600 dark:text-gray-400">{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top antibiotics */}
          <div className="card p-5">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Top 5 Antibiotics Prescribed</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 mb-4">Count by antibiotic name</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={current.topAntibiotics || []}
                  layout="vertical"
                  margin={{ left: 0, right: 12, top: 0, bottom: 0 }}
                >
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={108} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TooltipStyle} />
                  <Bar dataKey="count" fill="#0d7377" radius={[0, 5, 5, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Monthly trend */}
        <div className="card p-5">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Monthly Trends</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 mb-4">
            Guideline adherence &amp; narrow-spectrum rate over time
          </p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.trend} margin={{ left: 0, right: 12, top: 4, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false} tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip contentStyle={TooltipStyle} formatter={(v) => `${v}%`} />
                <Legend
                  iconType="circle" iconSize={7}
                  formatter={(v) => <span className="text-xs text-gray-600 dark:text-gray-400">{v}</span>}
                />
                <Line
                  type="monotone" dataKey="adherence" name="Guideline Adherence"
                  stroke="#0d7377" strokeWidth={2}
                  dot={{ r: 3, fill: '#0d7377', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone" dataKey="narrowSpectrum" name="Narrow Spectrum %"
                  stroke="#16a34a" strokeWidth={2}
                  dot={{ r: 3, fill: '#16a34a', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Viral prescribing alert */}
        {(current.viralInfectionsWithAntibiotics?.count || 0) > 0 && (
          <div className="card border-l-4 border-amber-400 p-5">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" style={{ width: '1.125rem', height: '1.125rem' }} />
              </div>
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
                  Viral Infection Prescribing Alert
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                  {current.viralInfectionsWithAntibiotics?.count || 0} prescriptions
                  ({current.viralInfectionsWithAntibiotics?.percentage || 0}%) were for likely
                  viral infections in the last 30 days. Consider watchful waiting for low bacterial
                  probability cases.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer spacer */}
        <div className="h-4" />
      </div>
    </div>
  );
};

export default PrescribingDashboard;
