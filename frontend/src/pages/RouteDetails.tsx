import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, TrendingDown, TrendingUp, AlertCircle, Calendar, BrainCircuit, Info, ShieldCheck, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from '../components/ui/Cards';
import { ChartCard } from '../components/ui/Cards';
import { DataTable } from '../components/ui/DataTable';
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
      setError("Invalid route format");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsResp, predResp] = await Promise.all([
          airfareService.getRouteStats(origin, destination),
          airfareService.getBookingPrediction(origin, destination).catch(e => {
            console.error("Prediction API error:", e);
            return null;
          })
        ]);
        setData(statsResp);
        setPrediction(predResp);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch route details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [origin, destination]);

  if (loading && (!data || !prediction)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#718198] animate-pulse">Analyzing route data for {origin} to {destination}...</p>
      </div>
    );
  }

  if (error && (!data || !prediction)) {
    return (
      <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-4 text-red-400">
        <AlertCircle size={24} />
        <div>
          <h3 className="font-semibold text-lg">Error loading route</h3>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/dashboard/routes')}
            className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <button 
          onClick={() => navigate('/dashboard/routes')}
          className="flex items-center gap-2 text-sm text-[#718198] hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Routes
        </button>
        <h1 className="text-3xl font-bold text-white tracking-tight">{origin} {'\u2192'} {destination}</h1>
        <p className="text-[#718198] mt-1">Detailed performance and pricing analytics for this specific corridor.</p>
      </div>

      {/* Booking Window Intelligence */}
      {prediction && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <BrainCircuit size={20} />
            </div>
            <h2 className="text-xl font-semibold text-white">Booking Window Intelligence</h2>
          </div>
          
          {prediction.status === 'insufficient_data' ? (
            <Card className="bg-[#0B1728] border-[#24344A]">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Info className="text-sky-400 mt-1 shrink-0" size={20} />
                  <div>
                    <h3 className="text-lg font-medium text-slate-200 mb-2">Insufficient historical data</h3>
                    <p className="text-slate-400">{prediction.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : prediction.status === 'success' && prediction.predicted_fare ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Forecast Card */}
              <Card className="bg-gradient-to-br from-[#101D30] to-[#0B1728] border-[#24344A] lg:col-span-2">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Current Fare</p>
                      <p className="text-3xl font-light text-white mt-1">₹{prediction.current_fare?.toLocaleString('en-IN')}</p>
                    </div>
                    
                    <ArrowLeft size={24} className="text-slate-600 rotate-180" />
                    
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Expected in 7 Days</p>
                      <p className="text-3xl font-light text-indigo-400 mt-1">
                        ₹{prediction.predicted_fare['7_days']?.low.toLocaleString('en-IN')} {'\u2013'} ₹{prediction.predicted_fare['7_days']?.high.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-[#24344A]">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Probability of Increase</p>
                      <p className="text-2xl text-slate-200">{prediction.probability_of_increase}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Booking Window Score</p>
                      <p className="text-2xl text-slate-200">{prediction.booking_score} <span className="text-sm text-slate-500">/ 100</span></p>
                    </div>
                  </div>
                  
                  <div className={`mt-6 p-4 rounded-lg flex items-center gap-3 ${
                    (prediction.booking_score || 0) > 75 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                    (prediction.booking_score || 0) > 55 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {(prediction.booking_score || 0) > 75 ? <AlertTriangle size={20} /> : <ShieldCheck size={20} />}
                    <span className="font-medium text-lg">{prediction.recommendation}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Factors Card */}
              <Card className="bg-[#0B1728] border-[#24344A]">
                <CardContent className="p-6">
                  <h3 className="text-base font-medium text-slate-200 mb-4">Why this prediction?</h3>
                  <ul className="space-y-4">
                    {prediction.factors?.map((factor, idx) => (
                      <li key={idx} className="flex gap-3 text-sm text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5"></div>
                        {factor}
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-8 pt-4 border-t border-[#24344A]">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Model Reliability</span>
                      <span className={prediction.model_reliability === 'HIGH' ? 'text-emerald-400' : 'text-amber-400'}>
                        {prediction.model_reliability}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card className="bg-[#0B1728] border-[#24344A]">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-[#718198] mb-1">Average Fare</p>
            <p className="text-3xl font-light text-[#F4F7FB]">₹{data.overall_stats.average_fare.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0B1728] border-[#24344A]">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-[#718198] mb-1">Minimum Fare</p>
            <p className="text-3xl font-light text-emerald-400">₹{data.overall_stats.minimum_fare.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0B1728] border-[#24344A]">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-[#718198] mb-1">Maximum Fare</p>
            <p className="text-3xl font-light text-rose-400">₹{data.overall_stats.maximum_fare.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0B1728] border-[#24344A]">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-[#718198] mb-1">Total Observations</p>
            <p className="text-3xl font-light text-sky-400">{data.overall_stats.total_observations.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Time Series Chart */}
      <ChartCard title="Pricing Trend Forecast" subtitle="Average fares grouped by upcoming travel dates">
        <div className="h-[350px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.price_trend} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1A2C47" />
              <XAxis 
                dataKey="travel_date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#718198', fontSize: 12 }}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
                }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#718198', fontSize: 12 }}
                tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0B1728', borderRadius: '8px', border: '1px solid #24344A' }}
                itemStyle={{ color: '#F4F7FB' }}
                formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Average Fare']}
                labelFormatter={(label) => new Date(label).toDateString()}
              />
              <Line 
                type="monotone" 
                dataKey="average_fare" 
                stroke="#38BDF8" 
                strokeWidth={3}
                dot={{ fill: '#0B1728', stroke: '#38BDF8', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#38BDF8', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Carrier Share */}
        <div>
          <h3 className="text-lg font-medium text-slate-200 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-sky-400" />
            Carrier Market Share
          </h3>
          <div className="bg-[#0B1728] border border-[#24344A] rounded-xl overflow-hidden">
            <DataTable 
              data={data.carrier_share}
              columns={[
                { header: 'Airline', accessor: 'airline' },
                { header: 'Observations', align: 'right', accessor: 'observations' },
                { 
                  header: 'Avg Fare', 
                  align: 'right', 
                  accessor: (row) => `₹${row.average_fare.toLocaleString('en-IN')}` 
                },
              ]}
            />
          </div>
        </div>

        {/* Cheapest Flights */}
        <div>
          <h3 className="text-lg font-medium text-slate-200 mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-emerald-400" />
            Top 5 Cheapest Flights Found
          </h3>
          <div className="space-y-3">
            {data.cheapest_flights.length === 0 ? (
              <p className="text-slate-500 italic p-4 bg-[#0B1728] rounded-xl border border-[#24344A]">No flights recorded yet.</p>
            ) : (
              data.cheapest_flights.map((flight, idx) => (
                <div key={idx} className="bg-[#0B1728] border border-[#24344A] p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-200">{flight.airline}</span>
                      <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{flight.flight_numbers}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Calendar className="w-4 h-4" />
                      {new Date(flight.travel_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      <span className="mx-1">•</span>
                      <Clock className="w-4 h-4" />
                      {flight.departure_time.split(' ')[1] || flight.departure_time}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-light text-emerald-400">₹{flight.fare_amount.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
