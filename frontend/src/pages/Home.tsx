import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plane, Activity, FileBarChart2 } from 'lucide-react';
import { AirfareXLogo } from '../components/ui/AirfareXLogo';

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#07111F] flex flex-col relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20" style={{
        backgroundImage: 'radial-gradient(#24344A 1px, transparent 1px)',
        backgroundSize: '32px 32px'
      }}></div>
      
      {/* Soft Glow Behind Logo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] z-0 pointer-events-none"></div>

      {/* Navbar */}
      <header className="bg-[#0B1728]/80 backdrop-blur-md border-b border-[#24344A] relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AirfareXLogo size={40} animated={true} />
            <span className="text-xl font-bold text-white tracking-tight">AirFareX</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-[#718198] hidden sm:block">MoSPI Problem Statement 26056</span>
            <button 
              onClick={() => navigate('/dashboard')}
              className="bg-[#101D30] text-[#A9B7C9] border border-[#24344A] px-4 py-2 rounded-lg text-sm font-medium hover:text-white hover:bg-[#14243A] transition-colors flex items-center gap-2"
            >
              Dashboard
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        
        <div className="mb-8 animate-fade-in-up">
          <AirfareXLogo size={200} animated={true} />
        </div>
        
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight max-w-4xl animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          Airfare Price Index <span className="text-[#4F46E5]">for India</span>
        </h1>
        
        <p className="mt-8 text-lg sm:text-xl text-[#A9B7C9] max-w-2xl leading-relaxed animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          An automated economic data platform designed to monitor domestic airfare movements across major Indian air travel corridors for enhanced Consumer Price Index (CPI) analysis.
        </p>
        
        <div className="mt-10 flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <button 
            onClick={() => navigate('/dashboard')}
            className="group bg-[#4F46E5] text-white px-8 py-3 rounded-xl text-base font-medium hover:bg-[#635BFF] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            Open Analytics Dashboard
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>
          <button 
            onClick={() => navigate('/dashboard/methodology')}
            className="bg-[#101D30] text-[#A9B7C9] border border-[#24344A] px-8 py-3 rounded-xl text-base font-medium hover:text-white hover:bg-[#14243A] transition-colors flex items-center justify-center gap-2"
          >
            Read Methodology
          </button>
        </div>

        {/* Live Data Snapshot */}
        <div className="mt-24 w-full max-w-4xl border-t border-[#24344A] pt-12 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <div className="text-xs font-bold tracking-widest text-[#718198] uppercase mb-8">
            ────────── Live Data ──────────
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-[#101D30] border border-[#24344A] rounded-2xl p-6 text-center hover:bg-[#14243A] transition-colors">
              <div className="text-sm font-medium text-[#A9B7C9] mb-2">Current Index</div>
              <div className="text-4xl font-bold text-white">127.4</div>
            </div>
            <div className="bg-[#101D30] border border-[#24344A] rounded-2xl p-6 text-center hover:bg-[#14243A] transition-colors">
              <div className="text-sm font-medium text-[#A9B7C9] mb-2">Monthly Change</div>
              <div className="text-4xl font-bold text-emerald-400">+4.8%</div>
            </div>
            <div className="bg-[#101D30] border border-[#24344A] rounded-2xl p-6 text-center hover:bg-[#14243A] transition-colors">
              <div className="text-sm font-medium text-[#A9B7C9] mb-2">Routes Tracked</div>
              <div className="text-4xl font-bold text-white">24</div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-[#0B1728] py-8 border-t border-[#24344A] text-center text-[#718198] text-sm relative z-10">
        <p>Built for MoSPI Hackathon Problem Statement 26056</p>
        <p className="mt-1">Production Environment - Live Data</p>
      </footer>
    </div>
  );
}

