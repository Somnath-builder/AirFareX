import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plane, Activity, FileBarChart2 } from 'lucide-react';

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Navbar */}
      <header className="bg-slate-900/50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="AirFareX Logo" className="h-10 w-10 object-contain rounded-md" />
            <span className="text-xl font-bold text-white tracking-tight">AirFareX</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-500 hidden sm:block">MoSPI Problem Statement 26056</span>
            <button 
              onClick={() => navigate('/dashboard')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              Go to Dashboard
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-16">
        <img src="/logo.jpg" alt="AirFareX Logo" className="h-32 w-32 object-contain rounded-2xl shadow-sm mb-8 mix-blend-multiply" />
        
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-200 tracking-tight max-w-3xl">
          Airfare Price Index for India
        </h1>
        
        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl leading-relaxed">
          An automated economic data platform monitoring domestic airfare movements across major Indian corridors for the augmentation of the Consumer Price Index (CPI).
        </p>
        
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-base font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            Open Analytics Dashboard
            <ArrowRight size={18} />
          </button>
          <button 
            onClick={() => navigate('/dashboard/methodology')}
            className="bg-slate-900/50 text-slate-300 border border-slate-700 px-8 py-3 rounded-xl text-base font-medium hover:bg-black transition-colors flex items-center justify-center gap-2"
          >
            Read Methodology
          </button>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-5xl w-full text-left">
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-sm">
            <div className="bg-indigo-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-indigo-400">
              <Activity size={24} />
            </div>
            <h3 className="text-lg font-semibold text-white">Real-time Monitoring</h3>
            <p className="mt-2 text-slate-400 text-sm leading-relaxed">
              Continuous tracking of fare movements across major airlines and routes.
            </p>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-sm">
            <div className="bg-emerald-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-emerald-400">
              <Plane size={24} />
            </div>
            <h3 className="text-lg font-semibold text-white">Lead-time Elasticity</h3>
            <p className="mt-2 text-slate-400 text-sm leading-relaxed">
              Analyzes how booking windows directly impact dynamic ticket pricing.
            </p>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-sm">
            <div className="bg-rose-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-rose-400">
              <FileBarChart2 size={24} />
            </div>
            <h3 className="text-lg font-semibold text-white">Index Construction</h3>
            <p className="mt-2 text-slate-400 text-sm leading-relaxed">
              Aggregates data using Laspeyres formulation for standardized CPI integration.
            </p>
          </div>
        </div>
      </main>
      
      <footer className="bg-slate-900 py-8 text-center text-slate-400 text-sm">
        <p>Built for MoSPI Hackathon Problem Statement 26056</p>
        <p className="mt-1">Demo Environment • Mock Data</p>
      </footer>
    </div>
  );
}
