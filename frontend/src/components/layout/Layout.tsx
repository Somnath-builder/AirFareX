import { useState, useEffect } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
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
  ServerCrash,
  Activity,
  ChevronRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AirfareXLogo } from '../ui/AirfareXLogo';
import { airfareService } from '../../services/airfareService';
import { CopilotHUD } from '../ui/CopilotHUD';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: 'Overview', path: '/dashboard', icon: LayoutDashboard, id: '01' },
  { name: 'Live Search', path: '/dashboard/search', icon: Search, id: '02' },
  { name: 'Route Intel', path: '/dashboard/routes', icon: Map, id: '03' },
  { name: 'Airfare Index', path: '/dashboard/index', icon: TrendingUp, id: '04' },
  { name: 'Lead Time Analytics', path: '/dashboard/lead-time', icon: Clock, id: '05' },
  { name: 'Airlines', path: '/dashboard/airlines', icon: Plane, id: '06' },
  { name: 'Data Explorer', path: '/dashboard/explorer', icon: Database, id: '07' },
  { name: 'Methodology', path: '/dashboard/methodology', icon: BookOpen, id: '08' },
];

export function Sidebar({ mobileOpen, setMobileOpen, isApiHealthy }: { mobileOpen: boolean, setMobileOpen: (v: boolean) => void, isApiHealthy: boolean }) {
  const location = useLocation();

  return (
    <>
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-[#030712]/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-[#0B1728]/90 backdrop-blur-xl border-r border-[#06b6d4]/20 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        mobileOpen ? "translate-x-0 shadow-[0_0_50px_rgba(6,182,212,0.15)]" : "-translate-x-full"
      )}>
        {/* Logo Area */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-[#06b6d4]/20 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-[#06b6d4]/0 via-[#06b6d4]/5 to-[#06b6d4]/0 -translate-x-full group-hover:animate-[shimmer_2s_infinite]"></div>
          
          <Link to="/" className="flex items-center gap-3 relative z-10" onClick={() => setMobileOpen(false)}>
            <div className="flex items-center justify-center">
              <AirfareXLogo size={40} animated={true} />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-sans font-bold tracking-tight text-xl leading-none flex items-center">
                AirFare<span className="text-[#ec4899] ml-0.5">X</span>
              </span>
            </div>
          </Link>
          
          <button className="lg:hidden text-[#718198] hover:text-[#06b6d4] transition-colors" onClick={() => setMobileOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* HUD Sub-header */}
        <div className="px-6 py-3 border-b border-[#24344A] bg-[#030712]/50 flex justify-between items-center text-[10px] font-mono tracking-widest text-[#718198] uppercase">
          <span>Sys.Nav</span>
          <span>v2.0.4</span>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/dashboard');
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "relative group flex items-center gap-4 px-4 py-3 border border-transparent transition-all overflow-hidden",
                  isActive 
                    ? "bg-[#06b6d4]/10 border-[#06b6d4]/50 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)] text-white" 
                    : "hover:bg-[#14243A] text-[#718198] hover:text-[#06b6d4] hover:border-[#24344A]"
                )}
              >
                {/* Active Indicator Line */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#06b6d4] shadow-[0_0_10px_#06b6d4]"></div>
                )}
                
                <span className="text-[10px] font-mono opacity-50 group-hover:text-[#ec4899] transition-colors">{item.id}</span>
                <item.icon size={18} className={isActive ? "text-[#06b6d4]" : ""} />
                <span className="text-sm font-medium tracking-wide uppercase">{item.name}</span>
                
                {isActive && (
                  <ChevronRight size={14} className="ml-auto text-[#06b6d4] opacity-50" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* System Health Monitor */}
        <div className="p-4 mt-auto">
          <div className="hud-border bg-[#030712]/80 p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#06b6d4]/50 to-transparent"></div>
            
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-mono text-[#718198] tracking-widest uppercase">Data Stream</span>
              <Activity size={12} className={cn("animate-pulse", isApiHealthy ? "text-[#06b6d4]" : "text-[#ec4899]")} />
            </div>
            
            <div className={cn(
              "flex items-center gap-3 text-sm font-mono tracking-wider",
              isApiHealthy ? "text-white" : "text-[#ec4899]"
            )}>
              {isApiHealthy ? (
                <>
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full bg-[#06b6d4] opacity-40"></span>
                    <span className="relative inline-flex h-3 w-3 bg-[#06b6d4] shadow-[0_0_8px_#06b6d4]"></span>
                  </div>
                  <span>LINK ACTIVE</span>
                </>
              ) : (
                <>
                  <ServerCrash size={16} />
                  <span>OFFLINE</span>
                </>
              )}
            </div>
            
            <div className="mt-3 flex gap-1 h-1 w-full bg-[#101D30]">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex-1", 
                    isApiHealthy ? "bg-[#06b6d4]" : "bg-[#24344A]",
                    isApiHealthy && i % 3 === 0 ? "opacity-50 animate-pulse" : ""
                  )}
                  style={{ animationDelay: `${i * 0.1}s` }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function TopBar({ setMobileOpen, isApiHealthy }: { setMobileOpen: (v: boolean) => void, isApiHealthy: boolean }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <header className="h-20 bg-transparent border-b border-[#06b6d4]/10 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <button 
          className="lg:hidden w-10 h-10 flex items-center justify-center border border-[#24344A] bg-[#0B1728] text-[#06b6d4] hover:bg-[#06b6d4]/10 transition-colors"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={20} />
        </button>
        
        
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-[10px] text-[#06b6d4] font-mono uppercase tracking-widest">Global Time</span>
          <span className="text-sm text-white font-mono">{timeString} IST</span>
        </div>
        
        {/* User / Agent icon */}
        <div className="w-10 h-10 border border-[#ec4899]/50 bg-[#ec4899]/10 flex items-center justify-center relative overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-[#ec4899]/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
          <span className="text-[#ec4899] font-mono text-sm relative z-10">OP</span>
        </div>
      </div>
    </header>
  );
}

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isApiHealthy, setIsApiHealthy] = useState(false);

  useEffect(() => {
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
    <div className="flex h-screen bg-[#030712] overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} isApiHealthy={isApiHealthy} />
      
      {/* Main Content Area with HUD scanlines background */}
      <div className="flex-1 flex flex-col relative">
        <div className="absolute inset-0 pointer-events-none z-0 opacity-20" style={{ 
          backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px)',
          backgroundSize: '100% 4px'
        }}></div>
        
        <TopBar setMobileOpen={setMobileOpen} isApiHealthy={isApiHealthy} />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 relative z-10">
          <div className="max-w-7xl mx-auto">
            <ErrorBoundary><Outlet /></ErrorBoundary>
          </div>
        </main>
      </div>
      
      {/* Global Intelligence Copilot */}
      <CopilotHUD />
    </div>
  );
}
