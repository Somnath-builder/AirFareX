import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Map, 
  Plane, 
  Clock, 
  Database, 
  BookOpen, 
  Menu,
  X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: 'Overview', path: '/', icon: LayoutDashboard },
  { name: 'Airfare Index', path: '/index', icon: TrendingUp },
  { name: 'Routes', path: '/routes', icon: Map },
  { name: 'Airlines', path: '/airlines', icon: Plane },
  { name: 'Lead Time Analysis', path: '/lead-time', icon: Clock },
  { name: 'Data Explorer', path: '/explorer', icon: Database },
  { name: 'Methodology', path: '/methodology', icon: BookOpen },
];

export function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean, setMobileOpen: (v: boolean) => void }) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      
      {/* Sidebar container */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center justify-between px-4 bg-slate-950">
          <div className="flex flex-col">
            <span className="text-white font-semibold text-lg tracking-tight">Airfare Price Index</span>
            <span className="text-slate-500 text-xs uppercase tracking-wider">MoSPI 26056</span>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                isActive 
                  ? "bg-indigo-600 text-white" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon size={18} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="flex items-center gap-2 text-indigo-400 mb-1">
              <Database size={14} />
              <span className="text-xs font-semibold uppercase tracking-wider">Environment</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              DEMO / MOCK DATA
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export function TopBar({ setMobileOpen }: { setMobileOpen: (v: boolean) => void }) {
  const currentDate = new Date('2026-09-07T10:42:00').toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button 
          className="lg:hidden text-slate-500 hover:text-slate-700"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={24} />
        </button>
        <h1 className="text-lg font-semibold text-slate-800 hidden sm:block">
          India Domestic Airfare Monitor
        </h1>
      </div>
      
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="hidden sm:inline">Live Data</span>
        </div>
        <div className="h-4 w-px bg-slate-300"></div>
        <span>{currentDate}</span>
      </div>
    </header>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar setMobileOpen={setMobileOpen} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
