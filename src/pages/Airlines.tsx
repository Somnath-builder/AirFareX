import { useEffect, useState } from 'react';
import { 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Plane, IndianRupee } from 'lucide-react';
import { KpiCard, ChartCard, TrendIndicator } from '../components/ui/Cards';
import { DataTable } from '../components/ui/DataTable';
import { airfareService } from '../services/airfareService';
import type { AirlineStats } from '../types';

export function Airlines() {
  const [airlines, setAirlines] = useState<AirlineStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const data = await airfareService.getAirlines();
      setAirlines(data);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return <div className="animate-pulse h-96 bg-slate-200 rounded-xl"></div>;
  }

  const sortedByFare = [...airlines].sort((a, b) => b.avgFare - a.avgFare);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Airline Analysis</h1>
        <p className="text-[#718198] mt-1">Comparative pricing analysis across major Indian carriers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard 
          title="Monitored Airlines" 
          value={airlines.length}
          icon={Plane}
        />
        <KpiCard 
          title="Highest Avg Fare" 
          value={`₹${sortedByFare[0]?.avgFare.toLocaleString('en-IN')}`}
          trendLabel={sortedByFare[0]?.airline}
          icon={IndianRupee}
        />
        <KpiCard 
          title="Lowest Avg Fare" 
          value={`₹${sortedByFare[airlines.length - 1]?.avgFare.toLocaleString('en-IN')}`}
          trendLabel={sortedByFare[airlines.length - 1]?.airline}
          icon={IndianRupee}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Average Fare by Airline" subtitle="Sorted from highest to lowest">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={sortedByFare} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis dataKey="airline" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} width={100} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Avg Fare']}
                />
                <Bar dataKey="avgFare" radius={[0, 4, 4, 0]}>
                  {sortedByFare.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : index === airlines.length - 1 ? '#10b981' : '#cbd5e1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Airline Comparison" subtitle="Detailed metrics per carrier">
          <div className="mt-4 -mx-5 -mb-5">
            <DataTable 
              data={airlines}
              columns={[
                { header: 'Airline', accessor: 'airline', className: 'font-medium text-white' },
                { header: 'Avg Fare', align: 'right', accessor: (row) => `₹${row.avgFare.toLocaleString('en-IN')}` },
                { header: 'MoM Change', align: 'right', accessor: (row) => <TrendIndicator value={row.momChange} suffix="%" inverse /> },
                { header: 'Routes', align: 'right', accessor: 'routesCount' },
              ]}
            />
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
