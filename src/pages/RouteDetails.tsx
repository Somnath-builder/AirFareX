import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, IndianRupee, Clock, TrendingUp } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { KpiCard, ChartCard, TrendIndicator } from '../components/ui/Cards';
import { airfareService } from '../services/airfareService';
import type { RouteStats, LeadTimeData } from '../types';

export function RouteDetails() {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const [route, setRoute] = useState<RouteStats | null>(null);
  const [leadTime, setLeadTime] = useState<LeadTimeData[]>([]);
  const [loading, setLoading] = useState(true);

  const decodedRoute = decodeURIComponent(routeId || '');

  useEffect(() => {
    const loadData = async () => {
      const routeData = await airfareService.getRouteDetails(decodedRoute);
      const leadTimeData = await airfareService.getLeadTimeData();
      setRoute(routeData);
      setLeadTime(leadTimeData);
      setLoading(false);
    };
    if (decodedRoute) loadData();
  }, [decodedRoute]);

  if (loading) {
    return <div className="animate-pulse h-96 bg-slate-200 rounded-xl"></div>;
  }

  if (!route) {
    return <div>Route not found</div>;
  }

  const fareComposition = [
    { name: 'Base Fare', value: Math.round(route.avgFare * 0.8), color: '#3b82f6' },
    { name: 'Taxes', value: Math.round(route.avgFare * 0.12), color: '#8b5cf6' },
    { name: 'Fees (UDF, Conv.)', value: Math.round(route.avgFare * 0.08), color: '#cbd5e1' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/routes')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{route.route}</h1>
          <p className="text-slate-500 mt-1">Route detailed analytics and fare composition</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard 
          title="Average Fare" 
          value={`₹${route.avgFare.toLocaleString('en-IN')}`}
          icon={IndianRupee}
        />
        <KpiCard 
          title="Monthly Change" 
          value={`${route.monthlyChange > 0 ? '+' : ''}${route.monthlyChange}%`}
          trend={route.monthlyChange}
          inverseTrend
        />
        <KpiCard 
          title="Weekly Change" 
          value={`${route.weeklyChange > 0 ? '+' : ''}${route.weeklyChange}%`}
          trend={route.weeklyChange}
          inverseTrend
        />
        <KpiCard 
          title="Daily Change" 
          value={`${route.dailyChange > 0 ? '+' : ''}${route.dailyChange}%`}
          trend={route.dailyChange}
          inverseTrend
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Booking Window Effect" subtitle="Average fare by days before departure (Lead time)">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[...leadTime].reverse()} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="daysBeforeDeparture" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(val) => `T-${val}`}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Fare']}
                  labelFormatter={(label) => `${label} days before departure`}
                />
                <Line 
                  type="stepAfter" 
                  dataKey="avgFare" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Fare Composition" subtitle="Average breakdown of total fare">
          <div className="h-[300px] w-full mt-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fareComposition}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {fareComposition.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, '']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-sm text-slate-500">Total</span>
              <span className="text-xl font-bold text-slate-200">₹{route.avgFare.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {fareComposition.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></span>
                {item.name}
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
