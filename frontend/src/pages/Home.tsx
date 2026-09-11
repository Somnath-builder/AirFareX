import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Activity, Globe } from 'lucide-react';
import { AircraftScene } from '../components/3d/AircraftScene';
import { AirfareXLogo } from '../components/ui/AirfareXLogo';
import { airfareService } from '../services/airfareService';

export function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ routes: 0, index: 0 });

  useEffect(() => {
    airfareService.getHealth().catch(() => {});
    airfareService.getPriceIndex().then((data: any) => {
      if (data && data.length > 0) {
        setStats({
          routes: 25, // Mock baseline
          index: data.data[data.data.length - 1].index
        });
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full flex flex-col justify-center overflow-hidden">
      


      {/* 3D Background */}
      <div className="absolute inset-0 z-0">
        <AircraftScene />
      </div>
      
      {/* HUD Overlays */}
      <div className="absolute top-10 right-10 z-10 hidden lg:flex flex-col items-end gap-2 text-xs font-mono text-[#06b6d4]/70 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[#ec4899] rounded-full animate-pulse"></span>
          SYS.LIVE
        </div>
        <div>COORDS: 28.6139° N, 77.2090° E</div>
        <div>DATA_STREAM // 04A7-B</div>
      </div>
      
      <div className="absolute bottom-10 left-10 z-10 hidden lg:block text-xs font-mono text-[#718198] pointer-events-none">
        <div className="hud-bracket p-4">
          <p className="neon-text-cyan">STATUS: NOMINAL</p>
          <p>OBSERVATIONS: LIVE</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 w-full flex flex-col lg:flex-row items-center">
        
        {/* Typography Left */}
        <div className="w-full lg:w-1/2 flex flex-col items-start pt-20 lg:pt-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#06b6d4]/30 bg-[#06b6d4]/10 text-[#06b6d4] text-xs font-mono font-medium mb-6 uppercase tracking-widest">
            <Activity size={14} className="animate-pulse" />
            Real-Time Intelligence
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold text-white tracking-tighter leading-[1.1] mb-6">
            AIRFARE<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#06b6d4] to-[#ec4899]">INTELLIGENCE</span><br/>
            FOR A HIGHER<br/>
            TOMORROW
          </h1>
          
          <p className="text-lg lg:text-xl text-slate-400 mb-10 max-w-xl font-light leading-relaxed">
            Real-time domestic airfare intelligence, route analytics, and predictive insights for data-driven aviation policy.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button 
              onClick={() => navigate('/dashboard')}
              className="group relative px-8 py-4 bg-[#0B1728] border border-[#06b6d4]/50 hover:border-[#06b6d4] text-white rounded-none transition-all overflow-hidden flex items-center justify-center gap-3 font-medium uppercase tracking-wider text-sm shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-[#06b6d4]/0 via-[#06b6d4]/10 to-[#06b6d4]/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
              <span>Explore Dashboard</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform text-[#ec4899]" />
            </button>
            
            <button 
              onClick={() => navigate('/dashboard/index')}
              className="px-8 py-4 bg-transparent border border-[#24344A] hover:bg-[#101D30] text-slate-300 rounded-none transition-all flex items-center justify-center gap-3 font-medium uppercase tracking-wider text-sm"
            >
              <Globe size={18} className="text-[#06b6d4]" />
              <span>Live Index: {stats.index ? stats.index.toFixed(1) : '...'}</span>
            </button>
          </div>
        </div>
        
        {/* Huge Logo Right Side */}
        <div className="w-full lg:w-1/2 h-[40vh] lg:h-auto flex items-center justify-center relative pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#06b6d4]/5 to-transparent blur-3xl rounded-full scale-150 -z-10"></div>
          <AirfareXLogo size={400} animated={true} />
        </div>
      </div>
      
      {/* Bottom Ticker */}
      <div className="absolute bottom-0 w-full h-8 bg-[#0B1728]/80 backdrop-blur-md border-t border-[#06b6d4]/20 overflow-hidden flex items-center">
        <div className="flex whitespace-nowrap animate-[marquee_30s_linear_infinite] text-xs font-mono text-[#06b6d4] tracking-widest uppercase">
          {[...Array(5)].map((_, i) => (
            <span key={i} className="mx-8">
              {i % 2 === 0 ? '● SYSTEM SECURE' : '● AIRFAREX DATALINK ACTIVE'} // {stats.routes} ROUTES TRACKED // MO_SPI 26056 
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
