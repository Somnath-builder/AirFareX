import React from 'react';
import { Lock, Cpu, ServerOff } from 'lucide-react';

export function DataExplorer() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 relative z-10 pt-20">
      <div className="glass-panel p-12 hud-bracket border-[#06b6d4]/50 relative overflow-hidden flex flex-col items-center justify-center text-center">
        {/* Scanline effect */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#06b6d4] to-transparent opacity-50 animate-[shimmer_2s_infinite]"></div>
        
        {/* Background grid */}
        <div className="absolute inset-0 pointer-events-none opacity-5" style={{ 
          backgroundImage: 'linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full border border-[#24344A] bg-[#030712] flex items-center justify-center mb-8 relative">
            <div className="absolute inset-0 rounded-full border-t border-[#06b6d4] animate-spin-slow"></div>
            <Lock size={32} className="text-[#06b6d4] opacity-50" />
            <Cpu size={16} className="text-[#ec4899] absolute bottom-2 right-2" />
          </div>

          <h2 className="text-3xl font-sans font-bold text-white tracking-tighter uppercase mb-4">
            Coming <span className="text-[#ec4899]">Soon</span>
          </h2>
          
          <div className="px-4 py-2 bg-[#030712] border border-[#ec4899]/30 text-[#ec4899] text-xs font-mono uppercase tracking-widest flex items-center gap-2 mb-8">
            <ServerOff size={14} />
            Backend Uplink Offline
          </div>

          <p className="text-sm font-mono text-[#A9B7C9] max-w-md mx-auto leading-relaxed">
            The macroeconomic forecasting models are currently undergoing calibration in the central server cluster. 
            <br/><br/>
            This module will unlock once the predictive backend APIs are fully wired and deployed to production.
          </p>

          <div className="mt-12 flex gap-4">
            <div className="w-16 h-1 bg-[#101D30] overflow-hidden">
              <div className="w-full h-full bg-[#06b6d4] animate-pulse"></div>
            </div>
            <div className="w-16 h-1 bg-[#101D30] overflow-hidden">
              <div className="w-full h-full bg-[#24344A]"></div>
            </div>
            <div className="w-16 h-1 bg-[#101D30] overflow-hidden">
              <div className="w-full h-full bg-[#24344A]"></div>
            </div>
          </div>
          <p className="text-[10px] font-mono text-[#718198] uppercase tracking-widest mt-4">Module Status: Coming Soon</p>
        </div>
      </div>
    </div>
  );
}
