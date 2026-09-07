import { useEffect, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { IndianRupee, TrendingUp, Map, Navigation, Plane } from 'lucide-react';
import { KpiCard, ChartCard, TrendIndicator } from '../components/ui/Cards';
import { DataTable } from '../components/ui/DataTable';
import { airfareService } from '../services/airfareService';
import { mockIndexTrend, mockCurrentIndex } from '../data/mockIndexData';
import { mockRoutes } from '../data/mockRoutes';

export function Overview() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate initial load
    const loadData = async () => {
      await airfareService.getIndexData();
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return <div className="animate-pulse space-y-6">
      <div className="h-20 bg-slate-200 rounded-xl"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>)}
      </div>
      <div className="h-96 bg-slate-200 rounded-xl"></div>
    </div>;
  }

  const topIncreases = [...mockRoutes].sort((a, b) => b.monthlyChange - a.monthlyChange).slice(0, 3);
  const topDecreases = [...mockRoutes].sort((a, b) => a.monthlyChange - b.monthlyChange).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">India Airfare Price Index</h1>
        <p className="text-slate-500 mt-1">Monitoring domestic airfare movements across major Indian city-pairs</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard 
          title="Current Index" 
          value={mockCurrentIndex.value}
          trend={mockCurrentIndex.monthlyChange}
          trendLabel="MoM"
          icon={TrendingUp}
        />
        <KpiCard 
          title="Daily Change" 
          value={`${mockCurrentIndex.dailyChange > 0 ? '+' : ''}${mockCurrentIndex.dailyChange}%`}
          trendLabel="vs previous day"
        />
        <KpiCard 
          title="Monthly Change" 
          value={`${mockCurrentIndex.monthlyChange > 0 ? '+' : ''}${mockCurrentIndex.monthlyChange}%`}
          trendLabel="vs previous month"
        />
        <KpiCard 
          title="Avg Domestic Fare" 
          value={`₹${mockCurrentIndex.averageFare.toLocaleString('en-IN')}`}
          trend={mockCurrentIndex.averageFareChange}
          inverseTrend
          icon={IndianRupee}
        />
        <KpiCard 
          title="Routes Tracked" 
          value={mockCurrentIndex.routesTracked}
          trendLabel={`${mockCurrentIndex.airlinesTracked} major airlines`}
          icon={Map}
        />
      </div>

      {/* Main Chart */}
      <ChartCard 
        title="Airfare Price Index Trend" 
        subtitle="Base Period = 100"
        action={
          <div className="flex bg-slate-100 p-1 rounded-md text-xs font-medium">
            <button className="px-3 py-1 rounded text-slate-500 hover:text-slate-900">3M</button>
            <button className="px-3 py-1 rounded bg-white text-slate-900 shadow-sm">6M</button>
            <button className="px-3 py-1 rounded text-slate-500 hover:text-slate-900">1Y</button>
          </div>
        }
      >
        <div className="h-[350px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockIndexTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(val) => {
                  const date = new Date(val);
                  return `${date.toLocaleString('default', { month: 'short' })} '${date.getFullYear().toString().slice(2)}`;
                }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                domain={['dataMin - 5', 'dataMax + 5']}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => [value.toFixed(1), 'Index']}
                labelFormatter={(label) => new Date(label as string).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              />
              <ReferenceLine y={100} stroke="#94a3b8" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Base (100)', fill: '#64748b', fontSize: 11 }} />
              <Line 
                type="monotone" 
                dataKey="index" 
                stroke="#4f46e5" 
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard 
            title="Route-wise Airfare Movement" 
            subtitle="Top tracked corridors across India"
            action={
              <button className="text-sm text-indigo-600 font-medium hover:text-indigo-700">View all routes</button>
            }
          >
            <div className="mt-4 -mx-5 -mb-5">
              <DataTable 
                data={mockRoutes.slice(0, 5)}
                columns={[
                  { 
                    header: 'Route', 
                    accessor: (row) => (
                      <div className="flex items-center gap-2">
                        <Navigation size={14} className="text-slate-400 rotate-45" />
                        <span className="font-medium text-slate-700">{row.route}</span>
                      </div>
                    )
                  },
                  { header: 'Avg Fare', accessor: (row) => `₹${row.avgFare.toLocaleString('en-IN')}`, align: 'right' },
                  { header: 'Daily', align: 'right', accessor: (row) => <TrendIndicator value={row.dailyChange} suffix="%" inverse /> },
                  { header: 'Weekly', align: 'right', accessor: (row) => <TrendIndicator value={row.weeklyChange} suffix="%" inverse /> },
                  { header: 'Monthly', align: 'right', accessor: (row) => <TrendIndicator value={row.monthlyChange} suffix="%" inverse /> },
                ]}
              />
            </div>
          </ChartCard>
        </div>

        <div>
          <ChartCard title="Top Movers" subtitle="Monthly change by route">
            <div className="mt-4 space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex justify-between">
                  <span>Biggest Increases</span>
                  <span className="text-rose-600">Red flags</span>
                </h4>
                <div className="space-y-3">
                  {topIncreases.map(r => (
                    <div key={r.route} className="flex justify-between items-center text-sm">
                      <span className="text-slate-700 font-medium">{r.route}</span>
                      <TrendIndicator value={r.monthlyChange} suffix="%" inverse />
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-px bg-slate-100"></div>
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex justify-between">
                  <span>Biggest Decreases</span>
                  <span className="text-emerald-600">Favorable</span>
                </h4>
                <div className="space-y-3">
                  {topDecreases.map(r => (
                    <div key={r.route} className="flex justify-between items-center text-sm">
                      <span className="text-slate-700 font-medium">{r.route}</span>
                      <TrendIndicator value={r.monthlyChange} suffix="%" inverse />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
