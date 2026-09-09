import { useEffect, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';
import { TrendingUp, Scale, Calculator, AlertCircle } from 'lucide-react';
import { KpiCard, ChartCard } from '../components/ui/Cards';
import { airfareService } from '../services/airfareService';
import type { PriceIndexPoint } from '../types';

export function AirfareIndex() {
  const [loading, setLoading] = useState(true);
  const [indexData, setIndexData] = useState<PriceIndexPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await airfareService.getPriceIndex();
        setIndexData(response.data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load index data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <div className="animate-pulse h-96 bg-slate-800 rounded-xl"></div>;
  }

  if (error || indexData.length === 0) {
    return (
      <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-center h-96">
        <AlertCircle className="w-12 h-12 text-slate-500 mb-4" />
        <h3 className="font-semibold text-lg text-slate-300 mb-2">Data Unavailable</h3>
        <p className="text-slate-500 max-w-md">{error || "No price index data is currently available in the database. Ensure the backend scraper is running."}</p>
      </div>
    );
  }

  // Calculate some basic stats from the real data
  const latestIndex = indexData[indexData.length - 1].index;
  const previousIndex = indexData.length > 1 ? indexData[indexData.length - 2].index : 100;
  const indexChange = Number(((latestIndex - previousIndex) / previousIndex * 100).toFixed(2));
  
  // Try to find the base period by looking for index roughly around 100 (or the first entry)
  const basePeriodEntry = indexData.find(d => Math.abs(d.index - 100) < 0.1) || indexData[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Airfare Price Index Deep Dive</h1>
        <p className="text-[#718198] mt-1">Understanding the construction and movement of the national airfare index</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard 
          title="Current Index" 
          value={latestIndex.toFixed(1)}
          trend={indexChange}
          trendLabel="Period-over-Period"
          icon={TrendingUp}
        />
        <KpiCard 
          title="Base Period" 
          value={new Date(basePeriodEntry.period).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
          trendLabel="Index = 100"
          icon={Scale}
        />
        <KpiCard 
          title="Methodology" 
          value="Laspeyres Base"
          trendLabel="Fixed weights"
          icon={Calculator}
        />
      </div>

      <ChartCard title="Historical Index Movement" subtitle="Index value relative to base period">
        <div className="h-[500px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={indexData} margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1A2C47" />
              <XAxis 
                dataKey="period" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#718198', fontSize: 12 }}
                tickFormatter={(val) => {
                  const date = new Date(val);
                  return `${date.toLocaleString('default', { month: 'short', day: 'numeric' })}`;
                }}
                dy={10}
              />
              <YAxis 
                yAxisId="left"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#718198', fontSize: 12 }}
                domain={['auto', 'auto']}
                name="Index Value"
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#718198', fontSize: 12 }}
                domain={['auto', 'auto']}
                name="Average Fare (₹)"
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0B1728', borderRadius: '8px', border: '1px solid #24344A', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }}
                itemStyle={{ color: '#F4F7FB' }}
                formatter={((value: any, name?: any) => [`${value}`, `Y (${name})`]) as any}
                labelFormatter={(label) => `X (Date): ${new Date(label as string).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}`}
              />
              <Legend verticalAlign="top" height={36}/>
              <ReferenceLine yAxisId="left" y={100} stroke="#4F46E5" strokeDasharray="3 3" opacity={0.5} label={{ position: 'insideTopLeft', value: 'Base (100)', fill: '#718198', fontSize: 11 }} />
              
              <Line 
                yAxisId="left"
                type="monotone" 
                name="Price Index"
                dataKey="index" 
                stroke="#38BDF8" 
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#0B1728', stroke: '#38BDF8' }}
                activeDot={{ r: 6, strokeWidth: 0, fill: '#38BDF8' }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                name="Average Fare"
                dataKey="average_fare" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3, strokeWidth: 2, fill: '#0B1728', stroke: '#8B5CF6' }}
                activeDot={{ r: 5, strokeWidth: 0, fill: '#8B5CF6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}



