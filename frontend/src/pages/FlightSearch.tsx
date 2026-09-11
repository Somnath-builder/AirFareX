import React, { useState } from 'react';
import { Search, PlaneTakeoff, ArrowRight, Calendar, Loader2, Radar, ShieldCheck, AlertTriangle } from 'lucide-react';
import { airfareService } from '../services/airfareService';
import type { SearchResponse, SearchFlightOption } from '../types';
import { AirportAutocomplete } from '../components/ui/AirportAutocomplete';



export function FlightSearch() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!origin || !destination) {
      setError("Please input origin and destination routing nodes.");
      return;
    }
    if (!travelDate) {
      setError("Please input a valid temporal sequence (travel date).");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const data = await airfareService.searchFlights(origin, destination, travelDate);
      setResults(data);
    } catch (err: any) {
      setError(err.message || "Failed to establish uplink with global distribution system (SerpApi).");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}H ${m}M`;
  };

  const FlightCard = ({ flight, isCheapest }: { flight: SearchFlightOption, isCheapest?: boolean }) => {
    const primaryAirline = flight.flights[0]?.airline || "UNKNOWN CARRIER";
    const flightNumber = flight.flights[0]?.flight_number || "XX000";
    
    const departure = flight.flights[0]?.departure_airport;
    const arrival = flight.flights[flight.flights.length - 1]?.arrival_airport;
    
    const extractTime = (timeStr?: string) => timeStr ? timeStr.split(' ')[1] : "--:--";

    return (
      <div className={`p-5 border relative overflow-hidden group transition-all duration-300 ${
        isCheapest 
          ? 'bg-[#ec4899]/5 border-[#ec4899]/50 shadow-[inset_0_0_20px_rgba(236,72,153,0.1)]' 
          : 'bg-[#030712]/80 border-[#24344A] hover:border-[#06b6d4]/50'
      }`}>
        {/* HUD scanline effect */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:animate-[shimmer_2s_infinite]"></div>
        
        {isCheapest && (
          <div className="absolute top-0 right-0 px-3 py-1 bg-[#ec4899]/20 border-b border-l border-[#ec4899]/50 text-[#ec4899] text-[10px] font-mono tracking-widest uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#ec4899] rounded-full animate-ping"></span>
            OPTIMAL ROUTE
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mt-2">
          
          {/* Airline Info */}
          <div className="flex items-center gap-4 min-w-[200px]">
            <div className={`w-12 h-12 flex items-center justify-center border ${isCheapest ? 'border-[#ec4899]/30 bg-[#ec4899]/10' : 'border-[#06b6d4]/30 bg-[#06b6d4]/10'}`}>
              <PlaneTakeoff size={20} className={isCheapest ? "text-[#ec4899]" : "text-[#06b6d4]"} />
            </div>
            <div>
              <p className="font-mono font-bold text-white uppercase tracking-wider">{primaryAirline}</p>
              <p className="font-mono text-xs text-[#718198]">{flightNumber}</p>
            </div>
          </div>

          {/* Flight Path */}
          <div className="flex-1 flex items-center justify-center w-full font-mono">
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-2xl text-white">{extractTime(departure?.time)}</p>
                <p className="text-xs text-[#06b6d4] tracking-widest">{departure?.id}</p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 text-[#24344A]">
                  <div className={`h-px w-12 ${isCheapest ? 'bg-[#ec4899]/50' : 'bg-[#06b6d4]/50'}`}></div>
                  <ArrowRight size={14} className={isCheapest ? 'text-[#ec4899]' : 'text-[#06b6d4]'} />
                  <div className={`h-px w-12 ${isCheapest ? 'bg-[#ec4899]/50' : 'bg-[#06b6d4]/50'}`}></div>
                </div>
                <p className="text-[10px] text-[#A9B7C9] mt-2 tracking-widest">{formatDuration(flight.total_duration_minutes)}</p>
                <p className="text-[10px] text-[#718198] tracking-widest">{flight.stops === 0 ? 'DIRECT' : `${flight.stops} HOPS`}</p>
              </div>

              <div className="text-left">
                <p className="text-2xl text-white">{extractTime(arrival?.time)}</p>
                <p className="text-xs text-[#06b6d4] tracking-widest">{arrival?.id}</p>
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="flex flex-col items-end min-w-[150px]">
            <p className="text-[10px] font-mono text-[#718198] uppercase tracking-widest mb-1">Total Fare</p>
            <p className={`text-3xl font-mono font-bold tracking-tighter ${isCheapest ? "text-[#ec4899]" : "text-[#06b6d4]"}`}>
              ₹{flight.price.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative z-10 pb-12">
      {/* Header */}
      <div className="border-b border-[#24344A] pb-4">
        <div className="inline-flex items-center gap-2 text-[#06b6d4] text-[10px] font-mono tracking-widest uppercase mb-2">
          <Radar size={14} className="animate-spin-slow" />
          Live Network Scanner
        </div>
        <h1 className="text-3xl font-sans font-bold text-white tracking-tighter uppercase">Query Global Distribution</h1>
        <p className="text-[#A9B7C9] font-mono text-xs mt-2">Intercepting real-time itineraries via SerpApi datalink.</p>
      </div>

      {/* Query Form */}
      <div className="glass-panel hud-bracket p-6 relative z-[100]">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end relative z-10">
          
          <div className="w-full">
            <label className="block text-[10px] font-mono text-[#718198] uppercase tracking-widest mb-2">Origin Node</label>
            {/* Custom AirportAutocomplete needs to be styled inside its component, but we assume it accepts classes or inherits */}
            <div className="relative border border-[#24344A] bg-[#030712] focus-within:border-[#06b6d4] transition-colors">
              <AirportAutocomplete value={origin} onChange={(val) => setOrigin(val.toUpperCase())} placeholder="e.g. DEL" />
            </div>
          </div>

          <div className="w-full">
            <label className="block text-[10px] font-mono text-[#718198] uppercase tracking-widest mb-2">Target Node</label>
            <div className="relative border border-[#24344A] bg-[#030712] focus-within:border-[#06b6d4] transition-colors">
              <AirportAutocomplete value={destination} onChange={(val) => setDestination(val.toUpperCase())} placeholder="e.g. BOM" />
            </div>
          </div>

          <div className="w-full">
            <label className="block text-[10px] font-mono text-[#718198] uppercase tracking-widest mb-2">Temporal Sequence</label>
            <div className="relative border border-[#24344A] bg-[#030712] focus-within:border-[#06b6d4] transition-colors">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Calendar size={14} className="text-[#718198]" />
              </div>
              <input 
                type="date" 
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className="w-full bg-transparent py-2.5 pl-10 pr-4 text-sm font-mono text-white placeholder:text-[#24344A] focus:outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full h-[42px] bg-[#06b6d4]/10 border border-[#06b6d4]/50 text-[#06b6d4] font-mono text-xs tracking-widest uppercase hover:bg-[#06b6d4]/20 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {loading ? "SCANNING..." : "INITIATE SCAN"}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 border border-[#ec4899] bg-[#ec4899]/5 flex items-start gap-3">
            <AlertTriangle className="text-[#ec4899] shrink-0" size={18} />
            <p className="text-sm font-mono text-[#ec4899]">{error}</p>
          </div>
        )}
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-end justify-between border-b border-[#24344A] pb-3">
            <div>
              <h2 className="text-lg font-mono font-bold text-white uppercase">
                <span className="text-[#06b6d4]">{results.count}</span> VECTORS IDENTIFIED
              </h2>
              <p className="text-xs font-mono text-[#718198]">
                {results.origin} <span className="text-[#06b6d4]">→</span> {results.destination}
              </p>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 bg-[#030712] border border-[#24344A] text-[10px] font-mono text-[#A9B7C9] uppercase">
              <ShieldCheck size={12} className="text-emerald-500" />
              Source: {results.source}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {results.cheapest && (
              <FlightCard flight={results.cheapest} isCheapest={true} />
            )}
            
            {results.flights.filter(f => f !== results.cheapest).map((flight, idx) => (
              <FlightCard key={idx} flight={flight} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
