import { useEffect, useState, useMemo } from 'react';
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
import { IndianRupee, TrendingUp, Map, Navigation, Plane } from 'lucide-react';
import { KpiCard, ChartCard, TrendIndicator } from '../components/ui/Cards';
import { DataTable } from '../components/ui/DataTable';
import { airfareService } from '../services/airfareService';
import type { AnalyticsResponse, PriceIndexPoint, BackendRoute } from '../types';

import React, { Component, ErrorInfo, ReactNode } from 'react';
class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return <div className="p-8 text-red-500 bg-black z-50 fixed inset-0 overflow-auto"><h2>Crash in Overview:</h2><pre>{this.state.error?.stack}</pre></div>;
    }
    return this.props.children;
  }
}
export function Overview() {
  const [loading, setLoading] = useState(true);

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [indexData, setIndexData] = useState<PriceIndexPoint[]>([]);
  const [routesData, setRoutesData] = useState<BackendRoute[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [timeFilter, setTimeFilter] = useState<'1W' | '1M' | '3M' | 'All'>('All');
  
  const filteredIndexData = useMemo(() => {
    if (timeFilter === 'All') return indexData;
    const now = new Date();
    const cutoff = new Date();
    if (timeFilter === '1W') cutoff.setDate(now.getDate() - 7);
    else if (timeFilter === '1M') cutoff.setMonth(now.getMonth() - 1);
    else if (timeFilter === '3M') cutoff.setMonth(now.getMonth() - 3);
    
    return indexData.filter(d => new Date(d.period) >= cutoff);
  }, [indexData, timeFilter]);


  useEffect(() => {
    const loadData = async () => {
      try {
        const [analyticsRes, indexRes, routesRes] = await Promise.all([
          airfareService.getAnalytics(),
          airfareService.getPriceIndex(),
          airfareService.getRoutes()
        ]);
        
        setAnalytics(analyticsRes);
        setIndexData(indexRes.data || []);
        
        // Ensure routes are sorted by observations so we see the most popular ones
        const sortedRoutes = (routesRes.routes || []).sort((a, b) => 
          (b.observation_count || 0) - (a.observation_count || 0)
        );
        setRoutesData(sortedRoutes);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <div className="animate-pulse space-y-6">
      <div className="h-20 bg-slate-800 rounded-xl"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => <div key={i} className="h-32 bg-slate-800 rounded-xl"></div>)}
      </div>
      <div className="h-96 bg-slate-800 rounded-xl"></div>
    </div>;
  }

  if (error || !analytics) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
        <h3 className="font-semibold text-lg mb-2">Dashboard Error</h3>
        <p>{error}</p>
        <p className="mt-4 text-sm opacity-80">Check if the FastAPI backend is running on port 8000.</p>
      </div>
    );
  }

  // Calculate some dummy trends just for the UI since the backend analytics doesn't provide MoM change yet
  const latestIndex = indexData.length > 0 ? indexData[indexData.length - 1].index : 100;
  const previousIndex = indexData.length > 1 ? indexData[indexData.length - 2].index : 100;
  const indexChange = Number(((latestIndex - previousIndex) / previousIndex * 100).toFixed(2));

  // Sort airlines by average fare for the "Top Movers" equivalent
  const topAirlines = [...analytics.airlines].sort((a, b) => b.average_fare - a.average_fare).slice(0, 3);
  const cheapestAirlines = [...analytics.airlines].sort((a, b) => a.average_fare - b.average_fare).slice(0, 3);

  return (
    <ErrorBoundary><div className="space-y-6">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">AirFareX</h1>
        <p className="text-[#718198] mt-1">Monitoring domestic airfare movements across major Indian city-pairs</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard 
          title="Current Index" 
          value={latestIndex.toFixed(1)}
          trend={indexChange}
          trendLabel="MoM"
          icon={TrendingUp}
        />
        <KpiCard 
          title="Total Observations" 
          value={analytics.total_observations.toLocaleString('en-IN')}
          trendLabel="Scraped fares"
        />
        <KpiCard 
          title="Max Fare Recorded" 
          value={`₹${analytics.maximum_fare.toLocaleString('en-IN')}`}
          trendLabel="All time"
        />
        <KpiCard 
          title="Avg Domestic Fare" 
          value={`₹${analytics.average_fare.toLocaleString('en-IN')}`}
          icon={IndianRupee}
        />
        <KpiCard 
          title="Routes Tracked" 
          value={analytics.unique_routes}
          trendLabel={`${analytics.origin_airports} origin airports`}
          icon={Map}
        />
      </div>

      {/* Main Chart */}
      <ChartCard 
        title="Airfare Price Index Trend" 
        subtitle="Base Period = 100"
        action={
          <div className="flex bg-[#101D30] p-1 rounded-md text-xs font-medium border border-[#24344A]">
            <button onClick={() => setTimeFilter('1W')} className={`px-3 py-1 rounded ${timeFilter === '1W' ? 'bg-[#1A2C47] text-white shadow-sm' : 'text-[#718198] hover:text-white'}`}>1W</button>
            <button onClick={() => setTimeFilter('1M')} className={`px-3 py-1 rounded ${timeFilter === '1M' ? 'bg-[#1A2C47] text-white shadow-sm' : 'text-[#718198] hover:text-white'}`}>1M</button>
            <button onClick={() => setTimeFilter('3M')} className={`px-3 py-1 rounded ${timeFilter === '3M' ? 'bg-[#1A2C47] text-white shadow-sm' : 'text-[#718198] hover:text-white'}`}>3M</button>
            <button onClick={() => setTimeFilter('All')} className={`px-3 py-1 rounded ${timeFilter === 'All' ? 'bg-[#1A2C47] text-white shadow-sm' : 'text-[#718198] hover:text-white'}`}>All</button>
          </div>
        }
      >
        <div className="h-[350px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredIndexData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1A2C47" />
              <XAxis 
                dataKey="period" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#718198', fontSize: 12 }}
                tickFormatter={(val) => {
                  const date = new Date(val);
                  return `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })} '${date.getFullYear().toString().slice(2)}`;
                }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#718198', fontSize: 12 }}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0B1728', borderRadius: '8px', border: '1px solid #24344A', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }}
                itemStyle={{ color: '#F4F7FB' }}
                formatter={(value: any) => [`${Number(value).toFixed(1)}`, 'Y (Index)']}
                labelFormatter={(label) => `X (Date): ${new Date(label as string).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}`}
              />
              <Legend verticalAlign="top" height={36}/>
              <ReferenceLine y={100} stroke="#4F46E5" strokeDasharray="3 3" opacity={0.5} label={{ position: 'insideTopLeft', value: 'Base (100)', fill: '#718198', fontSize: 11 }} />
              <Line 
                type="monotone" 
                dataKey="index" 
                stroke="#38BDF8" 
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#0B1728', stroke: '#38BDF8' }}
                activeDot={{ r: 6, strokeWidth: 0, fill: '#38BDF8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard 
            title="Most Observed Routes" 
            subtitle="Top tracked corridors across India"
            action={
              <button className="text-sm text-sky-500 font-medium hover:text-sky-400">View all routes</button>
            }
          >
            <div className="mt-4 -mx-5 -mb-5">
              <DataTable 
                data={routesData.slice(0, 5)}
                columns={[
                  { 
                    header: 'Route', 
                    accessor: (row) => (
                      <div className="flex items-center gap-2">
                        <Navigation size={14} className="text-[#A9B7C9] rotate-45" />
                        <span className="font-medium text-[#F4F7FB]">{row.origin} - {row.destination}</span>
                      </div>
                    )
                  },
                  { header: 'Type', accessor: (row) => <span className="text-xs px-2 py-1 bg-slate-800 rounded-full">{row.type}</span> },
                  { header: 'Min Fare', align: 'right', accessor: (row) => `${(row.minimum_fare||0)} km` },
                  { header: 'Observations', align: 'right', accessor: (row) => (row.observation_count||0) },
                  { header: 'Avg Fare', align: 'right', accessor: (row) => `₹${(row.average_fare || 0).toLocaleString('en-IN')}` },
                ]}
              />
            </div>
          </ChartCard>
        </div>

        <div>
          <ChartCard title="Airline Insights" subtitle="By average historical fare">
            <div className="mt-4 space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-[#718198] uppercase tracking-wider mb-3 flex justify-between">
                  <span>Premium Carriers</span>
                </h4>
                <div className="space-y-3">
                  {topAirlines.map(a => (
                    <div key={a.airline} className="flex justify-between items-center text-sm">
                      <span className="text-[#F4F7FB] font-medium">{a.airline}</span>
                      <span className="text-slate-400">₹{a.average_fare.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-px bg-[#24344A]"></div>
              <div>
                <h4 className="text-xs font-semibold text-[#718198] uppercase tracking-wider mb-3 flex justify-between">
                  <span>Budget Carriers</span>
                </h4>
                <div className="space-y-3">
                  {cheapestAirlines.map(a => (
                    <div key={a.airline} className="flex justify-between items-center text-sm">
                      <span className="text-[#F4F7FB] font-medium">{a.airline}</span>
                      <span className="text-slate-400">₹{a.average_fare.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>
    </div></ErrorBoundary>
  );
}

