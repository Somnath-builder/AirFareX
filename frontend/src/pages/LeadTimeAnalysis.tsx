import React, { useEffect, useState } from 'react';
import { Clock, Loader2, AlertTriangle, Terminal } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, AreaChart, Area, Legend } from 'recharts';
import { airfareService } from '../services/airfareService';
import type { LeadTimeResponse } from '../types';

export function LeadTimeAnalysis() {
  const [data, setData] = useState<LeadTimeResponse | null>(null);
  const [routes, setRoutes] = useState<string[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available routes on mount
  useEffect(() => {
    airfareService.getRoutes()
      .then(res => {
        const routeStrings = res.routes.map(r => `${r.origin}-${r.destination}`);
        setRoutes(routeStrings);
      })
      .catch(err => console.error("Failed to fetch routes", err));
  }, []);

  // Fetch lead time data when selectedRoute changes
  useEffect(() => {
    setLoading(true);
    const params = selectedRoute !== 'ALL' ? { route: selectedRoute } : undefined;
    
    airfareService.getLeadTimeAnalysis(params)
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to fetch lead time telemetry.");
        setLoading(false);
      });
  }, [selectedRoute]);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center font-mono text-[#06b6d4]">
        <Terminal size={32} className="animate-pulse mb-4 opacity-50" />
        <p className="tracking-widest animate-pulse uppercase">CALCULATING BOOKING HORIZON...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 border border-[#ec4899] bg-[#030712] max-w-2xl mx-auto mt-20 relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-[#ec4899] shadow-[0_0_10px_#ec4899]"></div>
        <h2 className="text-xl font-bold font-mono text-white tracking-tighter uppercase">Telemetry Error</h2>
        <p className="text-[#A9B7C9] mt-2 font-mono text-sm">{error || "No data available."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative z-10 pb-12">
      {/* Header */}
      <div className="border-b border-[#24344A] pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-[#06b6d4] text-[10px] font-mono tracking-widest uppercase mb-2">
            <Clock size={14} className="opacity-70" />
            Temporal Analytics
          </div>
          <h1 className="text-3xl font-sans font-bold text-white tracking-tighter uppercase">Booking Horizon</h1>
          <p className="text-[#A9B7C9] font-mono text-xs mt-2">Fare dynamics relative to departure proximity.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-mono text-[#718198] tracking-widest uppercase">Select Route:</label>
          <select 
            value={selectedRoute} 
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="bg-[#030712] border border-[#24344A] text-[#06b6d4] text-xs font-mono py-1.5 px-3 focus:outline-none focus:border-[#06b6d4]"
          >
            <option value="ALL">AGGREGATE (ALL ROUTES)</option>
            {routes.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Curve Chart */}
        <div className="lg:col-span-2 glass-panel p-6 hud-border flex flex-col">
          <h3 className="text-sm font-mono text-white tracking-widest uppercase mb-6 flex justify-between">
            <span>Lead Time Curve</span>
            <span className="text-[10px] text-[#718198] bg-[#030712] border border-[#24344A] px-2 py-1">X: Days Before Departure</span>
          </h3>
          
          <div className="flex-1 w-full min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.curve} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="colorFare" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#14243A" />
                <XAxis 
                  dataKey="days_before_departure" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#718198', fontSize: 10, fontFamily: 'monospace' }} 
                  reversed={true} // Usually want X axis to show days counting down to 0
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#718198', fontSize: 10, fontFamily: 'monospace' }} 
                  domain={[0, 'auto']}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '10px' }} />
                  <Tooltip 
                  contentStyle={{ backgroundColor: '#030712', borderRadius: '0', border: '1px solid #06b6d4', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#06b6d4' }}
                  labelStyle={{ color: '#A9B7C9' }}
                  labelFormatter={(label) => `T MINUS ${label} DAYS`}
                  formatter={(value: any, name: any) => [`₹${Number(value).toLocaleString()}`, String(name).toUpperCase()]}
                />
                <ReferenceLine x={7} stroke="#ec4899" strokeDasharray="3 3" label={{ value: 'CRITICAL WINDOW (7D)', position: 'insideTop', fill: '#ec4899', fontSize: 10, fontFamily: 'monospace' }} />
                <Area 
                  type="monotone" 
                  dataKey="average_fare" 
                  name="Average Fare"
                  stroke="#06b6d4" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorFare)" 
                  activeDot={{ r: 6, fill: '#06b6d4', stroke: '#030712', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="median_fare" 
                  name="Median Fare"
                  stroke="#ec4899" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: '#ec4899', stroke: '#030712', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Windows sidebar */}
        <div className="space-y-6">
          <div className="glass-panel p-6 border-t-2 border-[#ec4899]">
            <h3 className="text-sm font-mono text-white tracking-widest uppercase mb-4 flex items-center gap-2">
              <AlertTriangle size={14} className="text-[#ec4899]" />
              AI Advisory
            </h3>
            <p className="text-xs font-mono text-[#A9B7C9] leading-relaxed">
              Based on network topography, the optimal booking vector is typically <strong className="text-[#06b6d4]">14-21 days</strong> prior to departure. Fares experience a <strong className="text-[#ec4899]">surge within 7 days</strong> of departure due to inventory scarcity and inelastic demand parameters.
            </p>
          </div>

          <div className="glass-panel p-6 hud-bracket">
            <h3 className="text-sm font-mono text-white tracking-widest uppercase mb-4">Window Averages</h3>
            <div className="space-y-3">
              {data.windows.map((w, i) => (
                <div key={i} className="flex justify-between items-center p-3 border border-[#24344A] bg-[#030712] relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 w-1 h-full ${i === 0 ? 'bg-[#ec4899]' : i === 1 ? 'bg-orange-500' : 'bg-emerald-500'}`}></div>
                  <div className="pl-2">
                    <p className="text-xs font-mono font-bold text-white tracking-wider">{w.label}</p>
                    <p className="text-[10px] font-mono text-[#718198] uppercase tracking-widest mt-0.5">{w.observations} pings</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono font-bold ${i === 0 ? 'text-[#ec4899]' : i === 1 ? 'text-orange-400' : 'text-emerald-400'}`}>
                      ₹{(w.average_fare || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
