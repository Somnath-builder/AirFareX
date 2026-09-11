import React, { useEffect, useState } from 'react';
import { Plane, Loader2, Activity } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { airfareService } from '../services/airfareService';
import type { AirlineAnalytic } from '../types';

export function Airlines() {
  const [airlines, setAirlines] = useState<AirlineAnalytic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    airfareService.getAnalytics()
      .then(res => {
        setAirlines(res.airlines || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to fetch airline metrics.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center font-mono text-[#06b6d4]">
        <Activity size={32} className="animate-spin mb-4 opacity-50" />
        <p className="tracking-widest animate-pulse uppercase">PROCESSING CARRIER METRICS...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 border border-[#ec4899] bg-[#030712] max-w-2xl mx-auto mt-20 relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-[#ec4899] shadow-[0_0_10px_#ec4899]"></div>
        <h2 className="text-xl font-bold font-mono text-white tracking-tighter uppercase">Metrics Error</h2>
        <p className="text-[#A9B7C9] mt-2 font-mono text-sm">{error}</p>
      </div>
    );
  }

  // Sort by observation volume
  const sortedAirlines = [...airlines].sort((a, b) => b.observations - a.observations);
  const maxFare = Math.max(...airlines.map(a => a.average_fare));

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative z-10 pb-12">
      {/* Header */}
      <div className="border-b border-[#24344A] pb-4">
        <div className="inline-flex items-center gap-2 text-[#06b6d4] text-[10px] font-mono tracking-widest uppercase mb-2">
          <Plane size={14} className="opacity-70" />
          Carrier Telemetry
        </div>
        <h1 className="text-3xl font-sans font-bold text-white tracking-tighter uppercase">Airline Metrics</h1>
        <p className="text-[#A9B7C9] font-mono text-xs mt-2">Volume and pricing breakdown across identified carriers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Carrier Share Chart */}
        <div className="glass-panel p-6 hud-border flex flex-col min-h-[400px]">
          <h3 className="text-sm font-mono text-white tracking-widest uppercase mb-6">Network Dominance (By Pings)</h3>
          
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedAirlines} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#14243A" />
                <XAxis 
                  type="number" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#718198', fontSize: 10, fontFamily: 'monospace' }} 
                />
                <YAxis 
                  type="category" 
                  dataKey="airline" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#A9B7C9', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' }} 
                />
                <Tooltip 
                  cursor={{ fill: '#06b6d4', opacity: 0.1 }}
                  contentStyle={{ backgroundColor: '#030712', borderRadius: '0', border: '1px solid #06b6d4', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#06b6d4' }}
                />
                <Bar dataKey="observations" radius={[0, 4, 4, 0]}>
                  {sortedAirlines.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#ec4899' : '#06b6d4'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pricing Matrix */}
        <div className="glass-panel p-6 hud-bracket">
          <h3 className="text-sm font-mono text-white tracking-widest uppercase mb-6">Pricing Matrix</h3>
          
          <div className="space-y-5">
            {[...airlines].sort((a,b) => b.average_fare - a.average_fare).map((a, i) => {
              const pct = (a.average_fare / maxFare) * 100;
              return (
                <div key={i} className="group relative">
                  <div className="flex justify-between text-xs font-mono mb-2">
                    <span className="text-[#A9B7C9] uppercase font-bold tracking-wider">{a.airline}</span>
                    <span className="text-white">₹{a.average_fare.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="h-2 w-full bg-[#101D30] overflow-hidden relative">
                    <div className="absolute inset-0 bg-[#24344A]" style={{ width: '100%' }}></div>
                    <div className="h-full bg-gradient-to-r from-[#06b6d4] to-[#ec4899] transition-all duration-1000 ease-out" style={{ width: `${pct}%` }}></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-[#718198] uppercase mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>{a.observations} pings</span>
                    <span>{pct.toFixed(1)}% of Max</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
