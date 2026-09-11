import React, { useEffect, useState, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { TrendingUp, Activity, Terminal } from 'lucide-react';
import { airfareService } from '../services/airfareService';
import type { PriceIndexPoint } from '../types';

export function AirfareIndex() {
  const [indexData, setIndexData] = useState<PriceIndexPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    airfareService.getPriceIndex()
      .then(res => {
        setIndexData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to fetch Index Data stream.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center font-mono text-[#06b6d4]">
        <Terminal size={32} className="animate-pulse mb-4 opacity-50" />
        <p className="tracking-widest animate-pulse uppercase">SYNCHRONIZING WITH INDEX DATABASE...</p>
      </div>
    );
  }

  if (error || indexData.length === 0) {
    return (
      <div className="p-8 border border-[#ec4899] bg-[#030712] max-w-2xl mx-auto mt-20 relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-[#ec4899] shadow-[0_0_10px_#ec4899]"></div>
        <h2 className="text-xl font-bold font-mono text-white tracking-tighter uppercase">Sync Error</h2>
        <p className="text-[#A9B7C9] mt-2 font-mono text-sm">{error || "No data available in the current timeframe."}</p>
      </div>
    );
  }

  const latestIndex = indexData[indexData.length - 1].index;
  const previousIndex = indexData.length > 30 ? indexData[indexData.length - 31].index : indexData[0].index;
  const indexChange = ((latestIndex - previousIndex) / previousIndex) * 100;

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative z-10 pb-12">
      {/* Header */}
      <div className="border-b border-[#24344A] pb-4">
        <div className="inline-flex items-center gap-2 text-[#ec4899] text-[10px] font-mono tracking-widest uppercase mb-2">
          <Activity size={14} className="animate-pulse" />
          Macroeconomic Indicator
        </div>
        <h1 className="text-3xl font-sans font-bold text-white tracking-tighter uppercase">National Airfare Price Index</h1>
        <p className="text-[#A9B7C9] font-mono text-xs mt-2">Aggregated fare topography normalized to Base Period = 100.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* KPI Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 border-l-2 border-[#06b6d4]">
            <p className="text-[10px] font-mono text-[#718198] uppercase tracking-widest mb-1">Current Index Value</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-bold font-mono text-white tracking-tighter">{latestIndex.toFixed(1)}</h2>
              <span className={`text-sm font-mono ${indexChange > 0 ? 'text-[#ec4899]' : 'text-emerald-400'}`}>
                {indexChange > 0 ? '▲' : '▼'}{Math.abs(indexChange).toFixed(2)}%
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-[#24344A]">
              <p className="text-[10px] font-mono text-[#718198] uppercase tracking-widest mb-1">vs 30 Days Ago</p>
              <p className="text-sm font-mono text-[#06b6d4]">{previousIndex.toFixed(1)}</p>
            </div>
          </div>

          <div className="glass-panel p-6 hud-border">
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4">Methodology Log</h3>
            <ul className="space-y-3 font-mono text-[10px] text-[#A9B7C9]">
              <li className="flex items-start gap-2">
                <span className="text-[#06b6d4]">›</span> Computes weighted average of observed fares across tracked routes.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#06b6d4]">›</span> Normalizes daily values against the designated base period (Index = 100).
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#06b6d4]">›</span> Filters out severe statistical outliers and zero-fare entries.
              </li>
            </ul>
          </div>
        </div>

        {/* Chart Column */}
        <div className="lg:col-span-3">
          <div className="glass-panel p-6 hud-bracket relative h-full min-h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-mono text-white tracking-widest uppercase">Historical Trajectory</h3>
              <div className="flex items-center gap-2 px-2 py-1 bg-[#030712] border border-[#24344A] text-[10px] font-mono text-[#718198] uppercase">
                <span className="w-2 h-2 bg-[#ec4899] rounded-full"></span>
                Base: 100
              </div>
            </div>

            <div className="flex-1 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={indexData} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
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
                      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth()+1).toString().padStart(2, '0')}/${date.getFullYear()}`;
                    }}
                  />
                  <YAxis 
                    yAxisId="left"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#06b6d4', fontSize: 10, fontFamily: 'monospace' }}
                    domain={[0, 'auto']}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#ec4899', fontSize: 10, fontFamily: 'monospace' }}
                    domain={[0, 'auto']}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '10px' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#030712', borderRadius: '0px', border: '1px solid #06b6d4', boxShadow: '0 0 15px rgba(6,182,212,0.2)', fontFamily: 'monospace' }}
                    itemStyle={{ color: '#06b6d4' }}
                    labelStyle={{ color: '#A9B7C9', marginBottom: '5px' }}
                    formatter={(value: any, name: any) => [`${Number(value).toFixed(1)}`, String(name).toUpperCase()]}
                    labelFormatter={(label) => `DATE // ${new Date(label as string).toLocaleDateString('en-GB')}`}
                  />
                  <ReferenceLine yAxisId="left" y={100} stroke="#06b6d4" strokeDasharray="3 3" opacity={0.5} label={{ position: 'insideTopLeft', value: 'BASE (100)', fill: '#06b6d4', fontSize: 10, fontFamily: 'monospace' }} />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="index" 
                    name="Price Index"
                    stroke="#06b6d4" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorIndex)" 
                    activeDot={{ r: 6, fill: '#06b6d4', stroke: '#030712', strokeWidth: 2 }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="average_fare" 
                    name="Average Fare"
                    stroke="#ec4899" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: '#ec4899', stroke: '#030712', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
