import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { getDashboardStats } from '../data/prescribingHistory.js';
import { TrendingUp, TrendingDown, Minus, Pill, AlertTriangle, CheckCircle } from 'lucide-react';

const COLORS = ['#16a34a', '#eab308', '#f97316', '#dc2626', '#8b5cf6'];

const PrescribingDashboard = () => {
  const stats = getDashboardStats();
  const current = stats.last30Days || { total: 0, narrowSpectrum: { percentage: 0 }, broadSpectrum: { percentage: 0 }, viralInfectionsWithAntibiotics: { percentage: 0 }, adherenceRate: 0, topAntibiotics: [] };
  const facility = stats.facilityAverage;

  const getComparisonIndicator = (user, avg) => {
    const diff = user - avg;
    if (diff < -5) return { icon: TrendingDown, color: 'text-green-600', text: 'Better than average' };
    if (diff > 5) return { icon: TrendingUp, color: 'text-red-600', text: 'Above average' };
    return { icon: Minus, color: 'text-yellow-600', text: 'Similar to average' };
  };

  const narrowComparison = getComparisonIndicator(100 - current.narrowSpectrum?.percentage || 0, 100 - facility.narrowSpectrum);
  const adherenceComparison = getComparisonIndicator(current.adherenceRate || 0, facility.adherenceRate);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Prescribing Analytics</h1>
        <p className="text-gray-600">Your antibiotic stewardship metrics (Last 30 days)</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Prescriptions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Pill className="w-5 h-5 text-clinical-teal" />
            <span className="text-xs font-medium text-gray-500">30 days</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{current.total}</p>
          <p className="text-sm text-gray-600">Total prescriptions</p>
        </div>

        {/* Narrow Spectrum Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className={`text-xs font-medium ${narrowComparison.color}`}>
              {narrowComparison.text}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{current.narrowSpectrum?.percentage || 0}%</p>
          <p className="text-sm text-gray-600">Narrow-spectrum rate</p>
          <p className="text-xs text-gray-400 mt-1">
            Facility avg: {facility.narrowSpectrum}%
          </p>
        </div>

        {/* Broad Spectrum Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <span className="text-xs font-medium text-gray-500">Minimize</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{current.broadSpectrum?.percentage || 0}%</p>
          <p className="text-sm text-gray-600">Broad-spectrum rate</p>
          <p className="text-xs text-gray-400 mt-1">
            Facility avg: {facility.broadSpectrum}%
          </p>
        </div>

        {/* Adherence Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-clinical-teal" />
            <span className={`text-xs font-medium ${adherenceComparison.color}`}>
              {adherenceComparison.text}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{current.adherenceRate || 0}%</p>
          <p className="text-sm text-gray-600">Guideline adherence</p>
          <p className="text-xs text-gray-400 mt-1">
            Facility avg: {facility.adherenceRate}%
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Spectrum Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Spectrum Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Narrow', value: current.narrowSpectrum?.count || 0 },
                    { name: 'Medium', value: current.mediumSpectrum?.count || 0 },
                    { name: 'Broad', value: current.broadSpectrum?.count || 0 }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#16a34a" />
                  <Cell fill="#eab308" />
                  <Cell fill="#f97316" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Antibiotics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Antibiotics Prescribed</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={current.topAntibiotics || []} layout="vertical">
                <XAxis type="number" tick={{fontSize: 12}} />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                <Tooltip />
                <Bar dataKey="count" fill="#0d7377" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Trend Line */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.trend}>
              <XAxis dataKey="month" tick={{fontSize: 12}} />
              <YAxis tick={{fontSize: 12}} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend />
              <Line type="monotone" dataKey="adherence" name="Guideline Adherence" stroke="#0d7377" strokeWidth={2} dot={{r: 4}} />
              <Line type="monotone" dataKey="narrowSpectrum" name="Narrow Spectrum %" stroke="#16a34a" strokeWidth={2} dot={{r: 4}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Viral Prescribing Alert */}
      {(current.viralInfectionsWithAntibiotics?.count || 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">
                Viral Infection Prescribing Alert
              </p>
              <p className="text-sm text-amber-700 mt-1">
                {current.viralInfectionsWithAntibiotics?.count || 0} prescriptions ({current.viralInfectionsWithAntibiotics?.percentage || 0}%) 
                were for likely viral infections in the last 30 days. Consider watchful waiting for low bacterial probability cases.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescribingDashboard;
