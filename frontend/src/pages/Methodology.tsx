import React from 'react';
import { BookOpen, ShieldAlert, Cpu, TerminalSquare } from 'lucide-react';

export function Methodology() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 relative z-10 pb-12">
      {/* Header */}
      <div className="border-b border-[#24344A] pb-4">
        <div className="inline-flex items-center gap-2 text-[#ec4899] text-[10px] font-mono tracking-widest uppercase mb-2">
          <ShieldAlert size={14} />
          Confidential
        </div>
        <h1 className="text-3xl font-sans font-bold text-white tracking-tighter uppercase">System Operations Manual</h1>
        <p className="text-[#A9B7C9] font-mono text-xs mt-2">Architecture and data processing methodology for AirFareX.</p>
      </div>

      <div className="glass-panel p-8 hud-border relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 pointer-events-none opacity-5" style={{ 
          backgroundImage: 'linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}></div>

        <div className="relative z-10 space-y-8 text-sm font-mono leading-relaxed text-[#A9B7C9]">
          
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-widest flex items-center gap-3 border-b border-[#24344A] pb-2">
              <Cpu className="text-[#06b6d4]" size={18} />
              1.0 Data Ingestion Vector
            </h2>
            <p>
              The system utilizes a continuous data collection pipeline. Telemetry is sourced directly from <span className="text-[#06b6d4]">Google Flights via the SerpApi datalink</span>.
            </p>
            <ul className="space-y-2 pl-4 border-l border-[#06b6d4]/30">
              <li><strong className="text-white">Chronology:</strong> Automated scrapers execute at randomized intervals.</li>
              <li><strong className="text-white">Topology:</strong> Coverage includes the top 100 domestic aviation corridors in India.</li>
              <li><strong className="text-white">Lead Time Matrix:</strong> Fares are captured at T-minus 1, 3, 7, 14, 21, and 30 days.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-widest flex items-center gap-3 border-b border-[#24344A] pb-2">
              <TerminalSquare className="text-[#ec4899]" size={18} />
              2.0 Price Index Calculation
            </h2>
            <p>
              The National Airfare Price Index normalizes complex network topography into a single macroeconomic indicator.
            </p>
            <div className="bg-[#030712] border border-[#24344A] p-4 text-xs text-[#06b6d4]">
              <code>INDEX_t = (Σ (Price_i,t × Weight_i)) / (Σ (Price_i,0 × Weight_i)) × 100</code>
            </div>
            <p>
              Where <code className="text-white bg-[#101D30] px-1">Base Period (0)</code> is defined as the first month of system operation. Route weights are proportional to their passenger volume density.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-widest flex items-center gap-3 border-b border-[#24344A] pb-2">
              <BookOpen className="text-emerald-500" size={18} />
              3.0 Machine Learning Subsystem
            </h2>
            <p>
              The Booking Window Intelligence feature employs a <strong className="text-white">Random Forest Classifier</strong> trained on historical network data.
            </p>
            <ul className="space-y-2 pl-4 border-l border-emerald-500/30">
              <li>It analyzes departure proximity, route density, and carrier monopolies.</li>
              <li>Generates a probabilistic risk assessment of short-term fare surges.</li>
              <li>Requires a minimum threshold of 15 observations per route sector to achieve statistical reliability.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
