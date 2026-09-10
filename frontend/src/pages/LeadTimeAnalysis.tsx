import React, { useEffect, useState, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { Clock, TrendingUp, AlertCircle, Calendar } from 'lucide-react';
import { ChartCard } from '../components/ui/Cards';
import { DataTable } from '../components/ui/DataTable';
import { airfareService } from '../services/airfareService';
import type { LeadTimeResponse } from '../types';

export function LeadTimeAnalysis() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LeadTimeResponse | null>(null);
  
  // Filters
  const [routeFilter, setRouteFilter] = useState<string>('');
  const [airlineFilter, setAirlineFilter] = useState<string>('');

  useEffect(() => {
    const fetchLeadTimeData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await airfareService.getLeadTimeAnalysis({
          route: routeFilter || undefined,
          airline: airlineFilter || undefined,
        });
        setData(response);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch lead time analysis data');
      } finally {
        setLoading(false);
      }
    };

    fetchLeadTimeData();
  }, [routeFilter, airlineFilter]);

  // Re-sort the daily curve so it counts down from 45 to 0 (right-to-left effect on standard XAxis)
  // Actually, we'll sort ascending and use reversed={true} on XAxis
  const chartData = useMemo(() => {
    if (!data) return [];
    return [...data.curve].sort((a, b) => a.days_before_departure - b.days_before_departure);
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#718198] animate-pulse">Computing pricing curves...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-4 text-red-400">
        <AlertCircle size={24} />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Lead Time Analysis</h1>
        <p className="text-[#718198] mt-1">Discover how the booking window impacts fare pricing across airlines.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <select 
          className="bg-[#0B1728] border border-[#24344A] text-[#F4F7FB] px-4 py-2 rounded-lg focus:ring-2 focus:ring-sky-500/50 outline-none"
          value={routeFilter}
          onChange={(e) => setRouteFilter(e.target.value)}
        >
          <option value="">All Routes</option>
          {data?.available_routes.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        
        <select 
          className="bg-[#0B1728] border border-[#24344A] text-[#F4F7FB] px-4 py-2 rounded-lg focus:ring-2 focus:ring-sky-500/50 outline-none"
          value={airlineFilter}
          onChange={(e) => setAirlineFilter(e.target.value)}
        >
          <option value="">All Airlines</option>
          {data?.available_airlines.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Main Curve Chart */}
      <ChartCard title="Pricing Curve by Days to Departure" subtitle="Average fares plotted against advance booking days">
        <div className="h-[400px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1A2C47" />
              <XAxis 
                dataKey="days_before_departure" 
                reversed={true} 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#718198', fontSize: 12 }}
                label={{ value: "Days to Departure", position: 'insideBottom', offset: -10, fill: '#718198' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#718198', fontSize: 12 }}
                tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0B1728', borderRadius: '8px', border: '1px solid #24344A', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }}
                itemStyle={{ color: '#F4F7FB' }}
                labelFormatter={(label) => `T-${label} Days`}
                formatter={((value: any, name?: any) => [`₹${Number(value).toLocaleString('en-IN')}`, String(name ?? '')]) as any}
              />
              <Legend verticalAlign="top" height={36}/>
              <Line 
                type="monotone" 
                dataKey="average_fare" 
                name="Average Fare"
                stroke="#38BDF8" 
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: '#38BDF8', strokeWidth: 0 }}
              />
              <Line 
                type="monotone" 
                dataKey="median_fare" 
                name="Median Fare"
                stroke="#8B5CF6" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Grid for Bottom Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Booking Windows */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-400" />
            Macro Booking Windows
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {data?.windows.map(w => (
              <div key={w.key} className="bg-[#0B1728] border border-[#24344A] p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#718198] font-medium mb-1">{w.label}</p>
                  <p className="text-2xl font-light text-[#F4F7FB]">₹{w.average_fare.toLocaleString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#718198]">Observations</p>
                  <p className="text-sm font-medium text-[#A9B7C9]">{w.observations}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Carrier Surge Comparison */}
        <div>
          <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-sky-400" />
            Carrier Last-Minute Surge
          </h3>
          <div className="bg-[#0B1728] border border-[#24344A] rounded-xl overflow-hidden">
            <DataTable 
              data={data?.carrier_comparison || []}
              columns={[
                { header: 'Airline', accessor: 'airline' },
                { 
                  header: 'Advance Fare (14d+)', 
                  align: 'right', 
                  accessor: (row) => row.advance_avg_fare ? `₹${Math.round(row.advance_avg_fare).toLocaleString('en-IN')}` : <span className="text-slate-500">N/A</span>
                },
                { 
                  header: '0-1 Day Fare', 
                  align: 'right', 
                  accessor: (row) => row.last_minute_avg_fare ? <span className="text-emerald-400">₹{Math.round(row.last_minute_avg_fare).toLocaleString('en-IN')}</span> : <span className="text-slate-500">N/A</span>
                },
                { 
                  header: 'Surge', 
                  align: 'right', 
                  accessor: (row) => (
                    <span className={row.surge_percentage && row.surge_percentage > 50 ? 'text-red-400 font-medium' : 'text-slate-300'}>
                      {row.surge_percentage ? `+${row.surge_percentage}%` : 'N/A'}
                    </span>
                  )
                },
              ]}
            />
          </div>
        </div>
        
      </div>
    </div>
  );
}
