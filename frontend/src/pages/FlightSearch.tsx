import React, { useState } from 'react';
import { Search, PlaneTakeoff, PlaneLanding, Calendar, Loader2, ArrowRight, Clock, MapPin, IndianRupee } from 'lucide-react';
import { airfareService } from '../services/airfareService';
import type { SearchResponse, SearchFlightOption, FlightSegment } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Cards';
import clsx from 'clsx';


const AIRPORTS = [
  { code: 'DEL', city: 'Delhi' },
  { code: 'BOM', city: 'Mumbai' },
  { code: 'BLR', city: 'Bengaluru' },
  { code: 'CCU', city: 'Kolkata' },
  { code: 'HYD', city: 'Hyderabad' },
  { code: 'MAA', city: 'Chennai' },
  { code: 'AMD', city: 'Ahmedabad' },
  { code: 'PNQ', city: 'Pune' },
  { code: 'GOI', city: 'Goa (Dabolim)' },
  { code: 'GOX', city: 'Goa (Mopa)' },
  { code: 'JAI', city: 'Jaipur' },
  { code: 'LKO', city: 'Lucknow' },
  { code: 'COK', city: 'Kochi' },
  { code: 'PAT', city: 'Patna' },
  { code: 'BBI', city: 'Bhubaneswar' },
  { code: 'GAU', city: 'Guwahati' },
  { code: 'TRV', city: 'Thiruvananthapuram' },
  { code: 'ATQ', city: 'Amritsar' },
  { code: 'IXC', city: 'Chandigarh' },
  { code: 'SXR', city: 'Srinagar' },
];

function AirportAutocomplete({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder: string }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredAirports = AIRPORTS.filter(
    (a) => a.city.toLowerCase().includes(inputValue.toLowerCase()) || a.code.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all"
      />
      {isOpen && filteredAirports.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {filteredAirports.map((airport) => (
            <li
              key={airport.code}
              className="px-4 py-2 hover:bg-slate-800 cursor-pointer text-slate-200 flex justify-between items-center"
              onClick={() => {
                const finalValue = airport.code;
                setInputValue(finalValue);
                onChange(finalValue);
                setIsOpen(false);
              }}
            >
              <span>{airport.city}({airport.code})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


export const FlightSearch: React.FC = () => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResponse | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (origin.length !== 3 || destination.length !== 3) {
      setError("Please enter valid 3-letter airport codes (e.g., DEL, BOM).");
      return;
    }
    
    if (!travelDate) {
      setError("Please select a travel date.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const data = await airfareService.searchFlights(origin, destination, travelDate);
      setResults(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch flights. Ensure the backend is running and SERPAPI_API_KEY is configured.");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const FlightCard = ({ flight, isCheapest }: { flight: SearchFlightOption, isCheapest?: boolean }) => {
    // Determine primary airline from the first segment
    const primaryAirline = flight.flights[0]?.airline || "Unknown Airline";
    const flightNumber = flight.flights[0]?.flight_number || "";
    
    const departure = flight.flights[0]?.departure_airport;
    const arrival = flight.flights[flight.flights.length - 1]?.arrival_airport;
    
    const extractTime = (timeStr?: string) => timeStr ? timeStr.split(' ')[1] : "--:--";

    return (
      <div className={clsx(
        "relative rounded-xl border p-6 transition-all duration-300",
        isCheapest 
          ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
          : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
      )}>
        {isCheapest && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-slate-950 text-xs font-bold rounded-full shadow-lg">
            Cheapest Option
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          
          {/* Airline Info */}
          <div className="flex items-center gap-4 min-w-[200px]">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shadow-inner">
              <PlaneTakeoff className={clsx("w-6 h-6", isCheapest ? "text-emerald-400" : "text-sky-400")} />
            </div>
            <div>
              <p className="font-semibold text-slate-200">{primaryAirline}</p>
              <p className="text-sm text-slate-500">{flightNumber}</p>
            </div>
          </div>

          {/* Flight Path */}
          <div className="flex-1 flex items-center justify-center w-full">
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-light text-slate-200">{extractTime(departure?.time)}</p>
                <p className="text-sm text-slate-500 font-medium">{departure?.id}</p>
              </div>
              
              <div className="flex flex-col items-center px-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <div className="h-px w-8 bg-slate-700"></div>
                  <ArrowRight className="w-4 h-4" />
                  <div className="h-px w-8 bg-slate-700"></div>
                </div>
                <p className="text-xs text-slate-400 mt-1">{formatDuration(flight.total_duration_minutes)}</p>
                <p className="text-xs text-slate-500">{flight.stops === 0 ? 'Non-stop' : `${flight.stops} Stop(s)`}</p>
              </div>

              <div className="text-left">
                <p className="text-2xl font-light text-slate-200">{extractTime(arrival?.time)}</p>
                <p className="text-sm text-slate-500 font-medium">{arrival?.id}</p>
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="flex flex-col items-end min-w-[150px]">
            <p className="text-sm text-slate-400 mb-1">Total Fare</p>
            <p className={clsx(
              "text-3xl font-light",
              isCheapest ? "text-emerald-400" : "text-sky-400"
            )}>
              ₹{flight.price.toLocaleString()}
            </p>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-light tracking-tight text-slate-100">Live Flight Search</h1>
        <p className="text-slate-400">Search real-time fares directly from SerpApi (Google Flights).</p>
      </div>

      <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl shadow-xl overflow-visible relative z-50">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-slate-400 mb-2">Origin</label>
              <AirportAutocomplete value={origin} onChange={(val) => setOrigin(val.toUpperCase())} placeholder="DEL (e.g. Delhi)" />
            </div>

            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-slate-400 mb-2">Destination</label>
              <AirportAutocomplete value={destination} onChange={(val) => setDestination(val.toUpperCase())} placeholder="BOM (e.g. Mumbai)" />
            </div>

            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-slate-400 mb-2">Travel Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="date" 
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all [color-scheme:dark]"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full md:w-auto px-8 py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_25px_rgba(14,165,233,0.5)]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <p>{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {results && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium text-slate-200">
              Found {results.count} flights for <span className="text-sky-400">{results.origin}</span> to <span className="text-sky-400">{results.destination}</span>
            </h2>
            <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-400">
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
};


