import { useEffect, useState } from 'react';
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import { TrendingUp, Scale, Calculator } from 'lucide-react';
import { KpiCard, ChartCard, TrendIndicator } from '../components/ui/Cards';
import { airfareService } from '../services/airfareService';
import { mockIndexTrend, mockCurrentIndex, mockRouteContributions, mockRouteWeights } from '../data/mockIndexData';

export function AirfareIndex() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      await airfareService.getIndexData();
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return <div className="animate-pulse h-96 bg-slate-200 rounded-xl"></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Airfare Price Index Deep Dive</h1>
        <p className="text-slate-500 mt-1">Understanding the construction and movement of the national airfare index</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard 
          title="Current Index" 
          value={mockCurrentIndex.value}
          trend={mockCurrentIndex.monthlyChange}
          trendLabel="MoM"
          icon={TrendingUp}
        />
        <KpiCard 
          title="Base Period" 
          value={mockCurrentIndex.basePeriod}
          trendLabel="Index = 100"
          icon={Scale}
        />
        <KpiCard 
          title="Methodology" 
          value="Laspeyres"
          trendLabel="Fixed base weights"
          icon={Calculator}
        />
      </div>

      <ChartCard title="Historical Index Movement" subtitle="Index value relative to base period">
        <div className="h-[400px] w-full mt-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Route Contributions to Monthly Change" subtitle="Which routes drove the +4.8% movement?">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={mockRouteContributions} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis dataKey="route" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} width={80} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`+${value.toFixed(1)} pp`, 'Contribution']}
                />
                <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
                  {mockRouteContributions.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.contribution > 0 ? '#3b82f6' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Route Basket Weights" subtitle="Relative importance of each route in the index">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={mockRouteWeights} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 30]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis dataKey="route" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} width={80} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`${value}%`, 'Weight']}
                />
                <Bar dataKey="weight" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
