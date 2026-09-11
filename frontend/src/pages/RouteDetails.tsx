import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, TrendingDown, TrendingUp, AlertCircle, Calendar, BrainCircuit, ShieldCheck, AlertTriangle, Info, Terminal } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { airfareService } from '../services/airfareService';
import type { RouteStatsResponse, BookingPredictionResponse } from '../types';

export function RouteDetails() {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const decodedRoute = decodeURIComponent(routeId || '');
  const [origin, destination] = decodedRoute.split('-');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RouteStatsResponse | null>(null);
  const [prediction, setPrediction] = useState<BookingPredictionResponse | null>(null);

  useEffect(() => {
    if (!origin || !destination) {
      setError("Invalid routing parameters");
      setLoading(false);
      return;
    }

    Promise.all([
      airfareService.getRouteStats(origin, destination),
      airfareService.getBookingPrediction(origin, destination)
    ]).then(([statsData, predictionData]) => {
      setData(statsData);
      setPrediction(predictionData);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError("Failed to establish data stream for this route.");
      setLoading(false);
    });
  }, [origin, destination]);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center font-mono text-[#06b6d4]">
        <Terminal size={32} className="animate-pulse mb-4 opacity-50" />
        <p className="tracking-widest animate-pulse uppercase">ACCESSING ROUTE INTEL: {origin} → {destination}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 border border-[#ec4899] bg-[#030712] max-w-2xl mx-auto mt-20 relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-[#ec4899] shadow-[0_0_10px_#ec4899]"></div>
        <div className="flex items-start gap-4">
          <AlertTriangle className="text-[#ec4899]" size={24} />
          <div>
            <h2 className="text-xl font-bold font-mono text-white tracking-tighter uppercase">Routing Error</h2>
            <p className="text-[#A9B7C9] mt-2 font-mono text-sm">{error || "No data available for this route sector."}</p>
            <button 
              onClick={() => navigate(-1)} 
              className="mt-6 px-4 py-2 border border-[#ec4899] text-[#ec4899] text-xs font-mono uppercase tracking-widest hover:bg-[#ec4899]/10 transition-colors"
            >
              ← RETURN TO NETWORK
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Determine prediction visual state
  let statusColor = "text-emerald-400";
  let statusBorder = "border-emerald-500/50";
  let statusBg = "bg-emerald-500/10";
  
  if (prediction?.status === 'success') {
    if (prediction.risk_level === 'high') {
      statusColor = "text-[#ec4899]";
      statusBorder = "border-[#ec4899]/50 shadow-[0_0_15px_rgba(236,72,153,0.15)]";
      statusBg = "bg-[#ec4899]/10";
    } else if (prediction.risk_level === 'medium') {
      statusColor = "text-orange-400";
      statusBorder = "border-orange-500/50";
      statusBg = "bg-orange-500/10";
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 relative z-10">
      {/* HUD Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#24344A] pb-4 gap-4">
        <div>
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[#06b6d4] hover:text-white text-xs font-mono uppercase tracking-widest mb-4 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Network Map
          </button>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl md:text-5xl font-sans font-bold text-white tracking-tighter">
              {origin} <span className="text-[#06b6d4] font-light px-2">→</span> {destination}
            </h1>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 border border-[#06b6d4]/30 bg-[#06b6d4]/10 text-[#06b6d4] text-[10px] font-mono tracking-widest uppercase">
              <span className="w-1.5 h-1.5 bg-[#06b6d4] rounded-full animate-pulse"></span>
              SECTOR ACTIVE
            </div>
          </div>
        </div>
        
        <div className="text-left md:text-right font-mono">
          <p className="text-[10px] text-[#718198] tracking-widest uppercase">Distance Range</p>
          <p className="text-xl text-white">{((data as any).distance || 0).toLocaleString('en-IN')} <span className="text-[#06b6d4] text-sm">KM</span></p>
        </div>
      </div>

      {/* ML Booking Intelligence Widget - Cyberpunk Style */}
      {prediction && (
        <div className={`glass-panel p-6 ${statusBorder} relative overflow-hidden group`}>
          {/* Cyberpunk background accents */}
          <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none ${prediction.risk_level === 'high' ? 'bg-[#ec4899]' : 'bg-[#06b6d4]'}`}></div>
          
          <div className="flex items-center justify-between mb-6 relative z-10">
            <h2 className="text-sm font-mono font-bold text-white tracking-widest uppercase flex items-center gap-3">
              <BrainCircuit className={statusColor} size={18} />
              AI Booking Predictor
            </h2>
            <div className={`text-[10px] font-mono px-2 py-1 uppercase tracking-widest border ${statusBorder} ${statusColor} ${statusBg}`}>
              {prediction.status === 'insufficient_data' ? 'LEARNING MODE' : `RISK: ${prediction.risk_level}`}
            </div>
          </div>

          {prediction.status === 'insufficient_data' || prediction.status === 'error' ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-[#030712]/50 border border-[#24344A] border-dashed">
              <Info size={24} className="text-[#06b6d4] mb-3" />
              <h3 className="text-sm font-sans font-medium text-white">INSUFFICIENT HISTORICAL DATA</h3>
              <p className="text-xs font-mono text-[#718198] mt-2 max-w-md">
                The ML model requires a minimum of 15 observations on this exact sector to provide a reliable forecast. Data collection is currently ongoing.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
              <div className="bg-[#030712]/80 border border-[#24344A] p-4 hud-bracket">
                <p className="text-[10px] font-mono text-[#718198] uppercase tracking-widest mb-1">Current Fare</p>
                <p className="text-2xl font-bold text-white font-mono">₹{(prediction?.current_fare || 0).toLocaleString('en-IN')}</p>
              </div>
              
              <div className="bg-[#030712]/80 border border-[#24344A] p-4 hud-bracket">
                <p className="text-[10px] font-mono text-[#718198] uppercase tracking-widest mb-1 flex items-center gap-1">
                  Expected in 7 Days <Clock size={10} />
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-white font-mono">₹{(prediction.predicted_fare?.['7_days']?.expected || 0).toLocaleString('en-IN')}</p>
                  <span className={`text-[10px] font-mono px-1 py-0.5 border ${(prediction.predicted_fare?.['7_days']?.expected || 0) > (prediction?.current_fare || 0) ? 'border-[#ec4899] text-[#ec4899]' : 'border-emerald-500 text-emerald-400'}`}>
                    {(prediction.predicted_fare?.['7_days']?.expected || 0) > (prediction?.current_fare || 0) ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              <div className="bg-[#030712]/80 border border-[#24344A] p-4 hud-bracket">
                <p className="text-[10px] font-mono text-[#718198] uppercase tracking-widest mb-1">Increase Probability</p>
                <div className="flex items-center gap-3">
                  <p className={`text-2xl font-bold font-mono ${statusColor}`}>{prediction.probability_of_increase}%</p>
                  <div className="flex-1 h-1 bg-[#101D30]">
                    <div className={`h-full ${statusColor === 'text-[#ec4899]' ? 'bg-[#ec4899]' : statusColor === 'text-orange-400' ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{ width: `${prediction.probability_of_increase}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="bg-[#030712]/80 border border-[#24344A] p-4 hud-bracket">
                <p className="text-[10px] font-mono text-[#718198] uppercase tracking-widest mb-1">System Recommendation</p>
                <p className={`text-sm font-bold mt-1 tracking-tight ${statusColor}`}>
                  {prediction.recommendation}
                </p>
              </div>

              {/* Explanatory Factors Terminal */}
              <div className="lg:col-span-4 bg-[#030712] border border-[#24344A] p-4 mt-2 font-mono text-xs">
                <p className="text-[#06b6d4] mb-2 uppercase tracking-widest text-[10px]">/// MODEL EXPLANATION FACTORS</p>
                <ul className="space-y-1">
                  {(prediction.factors || []).map((factor, i) => (
                    <li key={i} className="flex items-start gap-2 text-[#A9B7C9]">
                      <span className="text-[#06b6d4] mt-0.5">›</span> {factor}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Chart Area */}
        <div className="lg:col-span-2 glass-panel p-6 hud-border">
          <div className="flex justify-between items-center mb-6 border-b border-[#24344A] pb-4">
            <h3 className="text-sm font-mono text-white tracking-widest uppercase">Historical Fare Topography</h3>
            <span className="text-[10px] font-mono text-[#718198] uppercase px-2 py-1 bg-[#030712] border border-[#24344A]">Last 30 Days</span>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.price_trend} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#14243A" />
                <XAxis 
                  dataKey="travel_date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#718198', fontSize: 10, fontFamily: 'monospace' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#718198', fontSize: 10, fontFamily: 'monospace' }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#030712', borderRadius: '0', border: '1px solid #06b6d4', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#06b6d4' }}
                  labelStyle={{ color: '#A9B7C9' }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'FARE']}
                />
                <Line 
                  type="stepAfter" 
                  dataKey="average_fare" 
                  stroke="#06b6d4" 
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#030712', stroke: '#06b6d4', strokeWidth: 1 }}
                  activeDot={{ r: 6, fill: '#ec4899', stroke: '#030712', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-6">
          <div className="glass-panel p-6 border-l-2 border-[#06b6d4]">
            <h3 className="text-sm font-mono text-white tracking-widest uppercase mb-4 pb-2 border-b border-[#24344A]">Route Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-[#718198] uppercase">Total Observations</span>
                <span className="font-mono text-white text-lg">{data.overall_stats.total_observations}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-[#718198] uppercase">Minimum Fare</span>
                <span className="font-mono text-emerald-400 text-lg">₹{data.overall_stats.minimum_fare.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-[#718198] uppercase">Maximum Fare</span>
                <span className="font-mono text-[#ec4899] text-lg">₹{data.overall_stats.maximum_fare.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-[#24344A]">
                <span className="text-[10px] font-mono text-[#06b6d4] uppercase tracking-widest">Average Fare</span>
                <span className="font-mono font-bold text-white text-2xl">₹{data.overall_stats.average_fare.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 hud-border">
            <h3 className="text-sm font-mono text-white tracking-widest uppercase mb-4 pb-2 border-b border-[#24344A]">Carrier Distribution</h3>
            <div className="space-y-3">
              {data.carrier_share.map((a, i) => (
                <div key={i} className="bg-[#030712] border border-[#24344A] p-3 flex justify-between items-center">
                  <span className="text-xs font-mono font-bold text-white uppercase">{a.airline}</span>
                  <div className="text-right">
                    <p className="text-[10px] font-mono text-[#718198] uppercase mb-1">Avg Fare</p>
                    <p className="font-mono text-[#06b6d4]">₹{a.average_fare.toLocaleString('en-IN')}</p>
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
