import { useEffect, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Clock, Info } from 'lucide-react';
import { ChartCard } from '../components/ui/Cards';
import { airfareService } from '../services/airfareService';
import type { LeadTimeData } from '../types';

export function LeadTimeAnalysis() {
  const [data, setData] = useState<LeadTimeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const result = await airfareService.getLeadTimeData();
      setData(result.reverse()); // Reverse to show from T-45 to T-1
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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lead-Time Elasticity</h1>
        <p className="text-slate-500 mt-1">How airfare changes as the departure date approaches</p>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex gap-3">
        <Info className="text-indigo-500 shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="text-sm font-semibold text-indigo-900">Key Insight</h4>
          <p className="text-sm text-indigo-700 mt-1">
            Fares generally increase as the departure date approaches, with the steepest 
            exponential increase observed during the final week (T-7 to T-1).
          </p>
        </div>
      </div>

      <ChartCard 
        title="Average Fare by Booking Window" 
        subtitle="Across all monitored routes"
        action={
          <div className="flex gap-2">
            <select className="text-sm border border-slate-200 rounded-md px-2 py-1 text-slate-600 outline-none">
              <option>All Routes</option>
              <option>DEL → BOM</option>
              <option>DEL → BLR</option>
            </select>
          </div>
        }
      >
        <div className="h-[450px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="colorFare" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="daysBeforeDeparture" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(val) => `T-${val} days`}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Average Fare']}
                labelFormatter={(label) => `${label} days before departure`}
              />
              <Area 
                type="monotone" 
                dataKey="avgFare" 
                stroke="#4f46e5" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorFare)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}
