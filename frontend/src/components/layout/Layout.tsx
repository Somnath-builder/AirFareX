import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Map, 
  Plane, 
  Clock, 
  Database, 
  BookOpen, 
  Menu,
  X,
  Search,
  ServerCrash
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AirfareXLogo } from '../ui/AirfareXLogo';
import { airfareService } from '../../services/airfareService';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Live Search', path: '/dashboard/search', icon: Search },
  { name: 'Airfare Index', path: '/dashboard/index', icon: TrendingUp },
  { name: 'Routes', path: '/dashboard/routes', icon: Map },
  { name: 'Airlines', path: '/dashboard/airlines', icon: Plane },
  { name: 'Lead Time Analysis', path: '/dashboard/lead-time', icon: Clock },
  { name: 'Data Explorer', path: '/dashboard/explorer', icon: Database },
  { name: 'Methodology', path: '/dashboard/methodology', icon: BookOpen },
];

export function Sidebar({ mobileOpen, setMobileOpen, isApiHealthy }: { mobileOpen: boolean, setMobileOpen: (v: boolean) => void, isApiHealthy: boolean }) {
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
        "fixed inset-y-0 left-0 z-50 w-64 bg-[#0B1728] border-r border-[#24344A] text-[#A9B7C9] transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <AirfareXLogo size={32} animated={true} />
            <div className="flex flex-col">
              <span className="text-white font-semibold text-lg tracking-tight leading-none">AirFareX</span>
              <span className="text-[#718198] text-[10px] uppercase tracking-wider mt-1">MoSPI 26056</span>
            </div>
          </div>
          <button className="lg:hidden text-[#718198] hover:text-white" onClick={() => setMobileOpen(false)}>
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
                  ? "bg-[#4F46E5] text-white" 
                  : "hover:bg-[#14243A] hover:text-white"
              )}
            >
              <item.icon size={18} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-[#101D30] rounded-lg p-3 border border-[#24344A]">
            <div className={cn("flex items-center gap-2 mb-1", isApiHealthy ? "text-[#4F46E5]" : "text-red-500")}>
              <Database size={14} />
              <span className="text-xs font-semibold uppercase tracking-wider">Environment</span>
            </div>
            <p className="text-xs text-[#718198] leading-relaxed">
              {isApiHealthy ? "PRODUCTION (FASTAPI)" : "DISCONNECTED / MOCK"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export function TopBar({ setMobileOpen, isApiHealthy }: { setMobileOpen: (v: boolean) => void, isApiHealthy: boolean }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentDate = now.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <header className="h-16 bg-[#0B1728] border-b border-[#24344A] flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button 
          className="lg:hidden text-[#718198] hover:text-white"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={24} />
        </button>
        <h1 className="text-lg font-semibold text-white hidden sm:block">
          Dashboard
        </h1>
      </div>
      
      <div className="flex items-center gap-4 text-sm text-[#718198]">
        {isApiHealthy ? (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="hidden sm:inline text-emerald-400 font-medium">API Connected</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ServerCrash className="w-4 h-4 text-red-500" />
            <span className="hidden sm:inline text-red-500 font-medium">Backend Offline</span>
          </div>
        )}
        <div className="h-4 w-px bg-[#24344A]"></div>
        <span>{currentDate}</span>
      </div>
    </header>
  );
}

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isApiHealthy, setIsApiHealthy] = useState(false);

  useEffect(() => {
    // Ping health endpoint on mount and every 30s
    const checkHealth = async () => {
      try {
        await airfareService.getHealth();
        setIsApiHealthy(true);
      } catch (e) {
        setIsApiHealthy(false);
      }
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-[#07111F] overflow-hidden font-sans">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} isApiHealthy={isApiHealthy} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar setMobileOpen={setMobileOpen} isApiHealthy={isApiHealthy} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <ErrorBoundary><Outlet /></ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}



