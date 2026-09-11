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
  Legend,
  Area,
  AreaChart
} from 'recharts';
import { IndianRupee, TrendingUp, Map, Navigation, Plane, AlertTriangle, Activity } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { airfareService } from '../services/airfareService';
import type { AnalyticsResponse, PriceIndexPoint, BackendRoute } from '../types';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return <div className="p-8 text-[#ec4899] bg-[#030712] border border-[#ec4899] z-50 relative"><h2 className="font-mono">SYS.CRASH :: OVERVIEW</h2><pre className="text-xs mt-2">{this.state.error?.stack}</pre></div>;
    }
    return this.props.children;
  }
}

// Futuristic KPI Card
function HudKpi({ title, value, unit = '', trend, trendLabel, icon: Icon, critical = false }: any) {
  return (
    <div className={`glass-panel hud-border p-5 relative overflow-hidden group ${critical ? 'border-[#ec4899]/50 shadow-[0_0_15px_rgba(236,72,153,0.15)]' : ''}`}>
      <div className={`absolute top-0 right-0 w-8 h-8 flex items-center justify-center border-l border-b ${critical ? 'border-[#ec4899]/30 bg-[#ec4899]/10' : 'border-[#06b6d4]/30 bg-[#06b6d4]/10'}`}>
        {Icon && <Icon size={14} className={critical ? "text-[#ec4899]" : "text-[#06b6d4]"} />}
      </div>
      
      <p className="text-[10px] font-mono text-[#718198] uppercase tracking-widest mb-1">{title}</p>
      
      <div className="flex items-baseline gap-1 mt-2">
        {unit && <span className={`text-lg font-mono ${critical ? 'text-[#ec4899]' : 'text-[#06b6d4]'}`}>{unit}</span>}
        <h3 className="text-3xl font-sans font-bold text-white tracking-tighter">{value}</h3>
      </div>
      
      {(trend !== undefined || trendLabel) && (
        <div className="mt-4 pt-3 border-t border-[#24344A]/50 flex items-center gap-2">
          {trend !== undefined && (
            <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 border ${trend > 0 ? (critical ? 'border-[#ec4899] text-[#ec4899]' : 'border-[#06b6d4] text-[#06b6d4]') : 'border-emerald-500 text-emerald-400'}`}>
              {trend > 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          <span className="text-[10px] text-[#718198] uppercase tracking-wider">{trendLabel}</span>
        </div>
      )}
      
      {/* HUD scanning line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:animate-[shimmer_2s_infinite]"></div>
    </div>
  );
}

export function Overview() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [indexData, setIndexData] = useState<PriceIndexPoint[]>([]);
  const [routesData, setRoutesData] = useState<BackendRoute[]>([]);
  const [timeFilter, setTimeFilter] = useState<'1W' | '1M' | '3M' | 'All'>('All');
  
  useEffect(() => {
    Promise.all([
      airfareService.getAnalytics(),
      airfareService.getPriceIndex().then(res => res.data),
      airfareService.getRoutes()
    ]).then(([analyticsData, indexData, routesData]) => {
      setAnalytics(analyticsData);
      setIndexData(indexData);
      setRoutesData((routesData as any).routes || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const filteredIndexData = useMemo(() => {
    if (timeFilter === 'All') return indexData;
    const now = new Date();
    const cutoff = new Date();
    if (timeFilter === '1W') cutoff.setDate(now.getDate() - 7);
    else if (timeFilter === '1M') cutoff.setMonth(now.getMonth() - 1);
    else if (timeFilter === '3M') cutoff.setMonth(now.getMonth() - 3);
    
    return indexData.filter(d => new Date(d.period) >= cutoff);
  }, [indexData, timeFilter]);

  if (loading || !analytics || indexData.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center font-mono text-[#06b6d4]">
        <Activity size={32} className="animate-spin mb-4 opacity-50" />
        <p className="tracking-widest animate-pulse">INITIALIZING DATA STREAMS...</p>
      </div>
    );
  }

  const latestIndex = indexData[indexData.length - 1]?.index || 100;
  const previousIndex = indexData.length > 30 ? indexData[indexData.length - 31].index : indexData[0].index;
  const indexChange = ((latestIndex - previousIndex) / previousIndex) * 100;

  // Mock anomalies for the Anomaly Monitor (since backend doesn't have an anomalies endpoint yet)
  const anomalies = [
    { route: 'DEL → BOM', change: '+18.4%', level: 'CRITICAL', color: 'text-[#ec4899]', border: 'border-[#ec4899]' },
    { route: 'BLR → DEL', change: '+15.2%', level: 'HIGH', color: 'text-orange-500', border: 'border-orange-500' },
    { route: 'BOM → HYD', change: '+12.6%', level: 'HIGH', color: 'text-orange-500', border: 'border-orange-500' },
    { route: 'DEL → MAA', change: '+10.3%', level: 'MODERATE', color: 'text-yellow-500', border: 'border-yellow-500' },
  ];

  return (
    <ErrorBoundary>
      <div className="space-y-6 max-w-7xl relative z-10">
        {/* Header section */}
        <div className="flex justify-between items-end border-b border-[#24344A] pb-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[#ec4899] text-xs font-mono mb-2">
              <span className="w-2 h-2 bg-[#ec4899] animate-pulse"></span>
              LIVE INTELLIGENCE
            </div>
            <h1 className="text-3xl font-sans font-bold text-white tracking-tighter">NETWORK OVERVIEW</h1>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-mono text-[#718198] uppercase tracking-widest">Last Updated</p>
            <p className="text-sm font-mono text-[#06b6d4]">{new Date().toLocaleTimeString('en-US')} IST</p>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <HudKpi 
            title="Airfare Price Index" 
            value={latestIndex.toFixed(1)}
            trend={indexChange}
            trendLabel="VS LAST MONTH"
            icon={TrendingUp}
            critical={indexChange > 5}
          />
          <HudKpi 
            title="Avg Domestic Fare" 
            value={analytics.average_fare.toLocaleString('en-IN')}
            unit="₹"
            trend={4.2} // Mock trend for visual
            trendLabel="MOM AVG"
            icon={IndianRupee}
          />
          <HudKpi 
            title="Routes Tracked" 
            value={analytics.unique_routes}
            trendLabel="LIVE CONNECTIONS"
            icon={Map}
          />
          <HudKpi 
            title="Anomalies Detected" 
            value="04"
            trendLabel="ACTION REQUIRED"
            icon={AlertTriangle}
            critical={true}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6 hud-bracket relative">
              <div className="flex justify-between items-center mb-6 border-b border-[#24344A] pb-4">
                <div>
                  <h3 className="text-sm font-mono text-white tracking-widest uppercase">Index Trend Analysis</h3>
                  <p className="text-[10px] text-[#718198] font-mono uppercase mt-1">BASE PERIOD = 100</p>
                </div>
                
                <div className="flex bg-[#030712] p-1 border border-[#06b6d4]/30">
                  {['1W', '1M', '3M', 'All'].map(f => (
                    <button 
                      key={f}
                      onClick={() => setTimeFilter(f as any)} 
                      className={`px-3 py-1 text-[10px] font-mono tracking-wider transition-colors ${timeFilter === f ? 'bg-[#06b6d4]/20 text-[#06b6d4]' : 'text-[#718198] hover:text-white'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredIndexData} margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="colorIndex" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#14243A" />
                    <XAxis 
                      dataKey="period" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#718198', fontSize: 10, fontFamily: 'monospace' }}
                      tickFormatter={(val) => {
                        const date = new Date(val);
                        return `${date.getDate()}/${date.getMonth()+1}`;
                      }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#718198', fontSize: 10, fontFamily: 'monospace' }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#030712', borderRadius: '0px', border: '1px solid #06b6d4', boxShadow: '0 0 15px rgba(6,182,212,0.2)', fontFamily: 'monospace' }}
                      itemStyle={{ color: '#06b6d4' }}
                      labelStyle={{ color: '#A9B7C9', marginBottom: '5px' }}
                      formatter={(value: any) => [`${Number(value).toFixed(1)}`, 'INDEX']}
                      labelFormatter={(label) => `DATE // ${new Date(label as string).toLocaleDateString('en-GB')}`}
                    />
                    <ReferenceLine y={100} stroke="#ec4899" strokeDasharray="3 3" opacity={0.5} label={{ position: 'insideTopLeft', value: 'BASE', fill: '#ec4899', fontSize: 10, fontFamily: 'monospace' }} />
                    <Area 
                      type="monotone" 
                      dataKey="index" 
                      stroke="#06b6d4" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorIndex)" 
                      activeDot={{ r: 6, fill: '#ec4899', stroke: '#030712', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="glass-panel p-6 border-t-2 border-[#06b6d4]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-mono text-white tracking-widest uppercase">Top Volume Routes</h3>
                <span className="text-[10px] text-[#06b6d4] font-mono cursor-pointer hover:underline">VIEW NETWORK MAP →</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#24344A] text-[10px] font-mono text-[#718198] uppercase tracking-widest">
                      <th className="pb-2 font-normal">Route Sector</th>
                      <th className="pb-2 font-normal text-right">Avg Fare</th>
                      <th className="pb-2 font-normal text-right">Vol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routesData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-[#14243A] hover:bg-[#06b6d4]/5 transition-colors cursor-pointer group">
                        <td className="py-3 text-sm font-medium text-white flex items-center gap-2">
                          <Navigation size={12} className="text-[#06b6d4] rotate-45 group-hover:text-[#ec4899]" />
                          {row.origin} <span className="text-[#718198]">→</span> {row.destination}
                        </td>
                        <td className="py-3 text-sm text-white text-right font-mono">₹{(row.average_fare || 0).toLocaleString('en-IN')}</td>
                        <td className="py-3 text-sm text-[#06b6d4] text-right font-mono">{row.observation_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            
            {/* Anomaly Monitor */}
            <div className="glass-panel p-5 border-t-2 border-[#ec4899]">
              <h3 className="text-sm font-mono text-white tracking-widest uppercase flex items-center gap-2 mb-4">
                <AlertTriangle size={14} className="text-[#ec4899]" />
                Anomaly Monitor
              </h3>
              
              <div className="space-y-3">
                {anomalies.map((anom, i) => (
                  <div key={i} className={`p-3 border border-[#24344A] bg-[#030712] relative overflow-hidden flex justify-between items-center cursor-pointer hover:border-[#06b6d4]/50 transition-colors`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${anom.border} opacity-50`}></div>
                    <div>
                      <p className="text-sm font-bold text-white tracking-tight">{anom.route}</p>
                      <p className={`text-[10px] font-mono mt-1 ${anom.color}`}>{anom.level}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-mono font-bold ${anom.color}`}>{anom.change}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Airline Breakdown */}
            <div className="glass-panel p-5 hud-border">
               <h3 className="text-sm font-mono text-white tracking-widest uppercase mb-4">Airline Pricing Matrix</h3>
               
               <div className="space-y-4">
                 {[...analytics.airlines].sort((a,b) => b.average_fare - a.average_fare).slice(0, 5).map((a, i) => {
                   const maxFare = Math.max(...analytics.airlines.map(x => x.average_fare));
                   const pct = (a.average_fare / maxFare) * 100;
                   return (
                     <div key={i}>
                       <div className="flex justify-between text-xs font-mono mb-1">
                         <span className="text-[#A9B7C9] uppercase">{a.airline}</span>
                         <span className="text-white">₹{a.average_fare.toLocaleString('en-IN')}</span>
                       </div>
                       <div className="h-1 w-full bg-[#101D30] overflow-hidden">
                         <div className="h-full bg-gradient-to-r from-[#06b6d4] to-[#ec4899]" style={{ width: `${pct}%` }}></div>
                       </div>
                     </div>
                   );
                 })}
               </div>
            </div>

          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
