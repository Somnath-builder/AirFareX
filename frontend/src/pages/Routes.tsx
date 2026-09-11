import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, Navigation, ArrowRight, Loader2, Activity } from 'lucide-react';
import { airfareService } from '../services/airfareService';
import type { BackendRoute } from '../types';

export function Routes() {
  const [routes, setRoutes] = useState<BackendRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    airfareService.getRoutes()
      .then(res => {
        setRoutes(res.routes || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to fetch route intel.");
        setLoading(false);
      });
  }, []);

  const filteredRoutes = routes.filter(r => 
    r.origin.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.destination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center font-mono text-[#06b6d4]">
        <Activity size={32} className="animate-spin mb-4 opacity-50" />
        <p className="tracking-widest animate-pulse uppercase">MAPPING NETWORK TOPOLOGY...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 border border-[#ec4899] bg-[#030712] max-w-2xl mx-auto mt-20 relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-[#ec4899] shadow-[0_0_10px_#ec4899]"></div>
        <h2 className="text-xl font-bold font-mono text-white tracking-tighter uppercase">Network Error</h2>
        <p className="text-[#A9B7C9] mt-2 font-mono text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative z-10 pb-12">
      {/* Header */}
      <div className="border-b border-[#24344A] pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-[#06b6d4] text-[10px] font-mono tracking-widest uppercase mb-2">
            <Map size={14} className="opacity-70" />
            Network Topology
          </div>
          <h1 className="text-3xl font-sans font-bold text-white tracking-tighter uppercase">Monitored Routes</h1>
          <p className="text-[#A9B7C9] font-mono text-xs mt-2">Corridors currently under active surveillance.</p>
        </div>
        
        
      </div>

      {/* Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRoutes.map((route, idx) => (
          <div 
            key={idx} 
            onClick={() => navigate(`/dashboard/routes/${route.origin}-${route.destination}`)}
            className="glass-panel p-5 cursor-pointer group hover:border-[#06b6d4]/50 transition-colors relative overflow-hidden"
          >
            {/* Scanline */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#06b6d4] to-transparent opacity-0 group-hover:animate-[shimmer_2s_infinite]"></div>
            
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold font-sans text-white tracking-tighter group-hover:text-[#06b6d4] transition-colors">{route.origin}</span>
                <Navigation size={14} className="text-[#718198] rotate-45" />
                <span className="text-2xl font-bold font-sans text-white tracking-tighter group-hover:text-[#06b6d4] transition-colors">{route.destination}</span>
              </div>
              <div className="px-2 py-1 bg-[#030712] border border-[#24344A] text-[10px] font-mono text-[#718198] uppercase">
                {route.distance} KM
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-[#24344A]">
              <div>
                <p className="text-[10px] font-mono text-[#718198] uppercase tracking-widest mb-1">Avg Fare</p>
                <p className="font-mono text-white text-sm">₹{(route.average_fare || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-mono text-[#718198] uppercase tracking-widest mb-1">Pings</p>
                <p className="font-mono text-[#06b6d4] text-sm">{route.observation_count || 0}</p>
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-2 text-[#06b6d4] text-[10px] font-mono tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight size={12} />
              ACCESS NODE INTEL
            </div>
          </div>
        ))}

        {filteredRoutes.length === 0 && (
          <div className="col-span-full py-12 text-center border border-[#24344A] border-dashed">
            <p className="font-mono text-sm text-[#718198] uppercase">NO MATCHING NODES FOUND IN NETWORK.</p>
          </div>
        )}
      </div>
    </div>
  );
}
