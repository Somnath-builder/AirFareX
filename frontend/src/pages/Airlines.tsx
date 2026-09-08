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
import { Plane, IndianRupee, Database, AlertCircle } from 'lucide-react';
import { KpiCard, ChartCard } from '../components/ui/Cards';
import { DataTable } from '../components/ui/DataTable';
import { airfareService } from '../services/airfareService';
import type { AirlineAnalytic } from '../types';

export function Airlines() {
  const [airlines, setAirlines] = useState<AirlineAnalytic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await airfareService.getAnalytics();
        setAirlines(data.airlines || []);
      } catch (err: any) {
        setError(err.message || "Failed to load airline analytics");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <div className="animate-pulse h-96 bg-slate-800 rounded-xl"></div>;
  }

  if (error || airlines.length === 0) {
    return (
      <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-center h-96">
        <AlertCircle className="w-12 h-12 text-slate-500 mb-4" />
        <h3 className="font-semibold text-lg text-slate-300 mb-2">Data Unavailable</h3>
        <p className="text-slate-500 max-w-md">{error || "No airline data available. Ensure the backend is collecting fares."}</p>
      </div>
    );
  }

  // The backend already sorts by observations, but let's create a copy sorted by average fare for the chart
  const sortedByFare = [...airlines].sort((a, b) => b.average_fare - a.average_fare);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Airline Analysis</h1>
        <p className="text-[#718198] mt-1">Comparative pricing and observation density across major Indian carriers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard 
          title="Monitored Airlines" 
          value={airlines.length}
          icon={Plane}
        />
        <KpiCard 
          title="Highest Avg Fare" 
          value={`₹${sortedByFare[0]?.average_fare.toLocaleString('en-IN')}`}
          trendLabel={sortedByFare[0]?.airline}
          icon={IndianRupee}
        />
        <KpiCard 
          title="Lowest Avg Fare" 
          value={`₹${sortedByFare[airlines.length - 1]?.average_fare.toLocaleString('en-IN')}`}
          trendLabel={sortedByFare[airlines.length - 1]?.airline}
          icon={IndianRupee}
        />
        <KpiCard 
          title="Most Observations" 
          value={airlines[0]?.observations.toLocaleString('en-IN')}
          trendLabel={airlines[0]?.airline}
          icon={Database}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Average Fare by Airline" subtitle="Sorted from highest to lowest historical average">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={sortedByFare} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1A2C47" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#718198', fontSize: 12 }} />
                <YAxis dataKey="airline" type="category" axisLine={false} tickLine={false} tick={{ fill: '#718198', fontSize: 12 }} width={100} />
                <Tooltip 
                  cursor={{ fill: '#0B1728' }}
                  contentStyle={{ backgroundColor: '#0B1728', borderRadius: '8px', border: '1px solid #24344A', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }}
                  itemStyle={{ color: '#F4F7FB' }}
                  formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Avg Fare']}
                />
                <Bar dataKey="average_fare" radius={[0, 4, 4, 0]}>
                  {sortedByFare.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#38BDF8' : index === airlines.length - 1 ? '#10B981' : '#4F46E5'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Airline Comparison" subtitle="Detailed metrics based on MongoDB fare observations">
          <div className="mt-4 -mx-5 -mb-5">
            <DataTable 
              data={airlines}
              columns={[
                { header: 'Airline', accessor: 'airline', className: 'font-medium text-white' },
                { header: 'Total Observations', align: 'right', accessor: (row) => row.observations.toLocaleString('en-IN') },
                { header: 'Historical Avg Fare', align: 'right', accessor: (row) => `₹${row.average_fare.toLocaleString('en-IN')}` },
              ]}
            />
          </div>
        </ChartCard>
      </div>
    </div>
  );
}


