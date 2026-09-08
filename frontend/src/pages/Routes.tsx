import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, AlertCircle } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { airfareService } from '../services/airfareService';
import type { BackendRoute } from '../types';

export function Routes() {
  const [routes, setRoutes] = useState<BackendRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await airfareService.getRoutes();
        // Sort by total observations by default
        const sorted = (response.routes || []).sort((a, b) => 
          (b.observation_count || 0) - (a.observation_count || 0)
        );
        setRoutes(sorted);
      } catch (err: any) {
        setError(err.message || "Failed to load routes");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredRoutes = routes.filter(r => 
    r.origin.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.destination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="animate-pulse h-96 bg-slate-800 rounded-xl"></div>;
  }

  if (error || routes.length === 0) {
    return (
      <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-center h-96">
        <AlertCircle className="w-12 h-12 text-slate-500 mb-4" />
        <h3 className="font-semibold text-lg text-slate-300 mb-2">Data Unavailable</h3>
        <p className="text-slate-500 max-w-md">{error || "No route data available. Check backend connection."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Routes Overview</h1>
          <p className="text-[#718198] mt-1">Airfare metrics across monitored domestic corridors</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#A9B7C9]" />
            <input
              type="text"
              placeholder="Search airports (DEL)..."
              className="pl-9 pr-4 py-2 border border-[#24344A] bg-[#101D30] text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border border-[#24344A] bg-[#101D30] rounded-lg text-sm font-medium text-[#F4F7FB] hover:bg-slate-800">
            <SlidersHorizontal size={16} />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>
      </div>

      <div className="bg-[#101D30] border border-[#24344A] rounded-xl overflow-hidden shadow-sm">
        <DataTable 
          data={filteredRoutes}
          columns={[
            { 
              header: 'Route', 
              accessor: (row) => (
                <button 
                  onClick={() => navigate(`/dashboard/routes/${encodeURIComponent(row.origin + '-' + row.destination)}`)}
                  className="font-semibold text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-2"
                >
                  {row.origin} → {row.destination}
                </button>
              )
            },
            { 
              header: 'Type', 
              accessor: (row) => <span className="text-xs px-2 py-1 bg-slate-800 rounded-full text-slate-300">{row.type}</span>
            },
            { 
              header: 'Min Fare', 
              align: 'right', 
              accessor: (row) => `${Math.round(row.minimum_fare || 0).toLocaleString()} ` 
            },
            { 
              header: 'Weekly Ops', 
              align: 'right', 
              accessor: (row) => row.observation_count || 0 
            },
            { 
              header: 'Observations', 
              align: 'right', 
              accessor: (row) => (row.observation_count || 0).toLocaleString('en-IN')
            },
            { 
              header: 'Avg Fare', 
              align: 'right', 
              accessor: (row) => <span className="font-medium text-white">₹{(row.average_fare || 0).toLocaleString('en-IN')}</span> 
            },
            {
              header: 'Action',
              align: 'center',
              accessor: (row) => (
                <button 
                  onClick={() => navigate(`/dashboard/routes/${encodeURIComponent(row.origin + '-' + row.destination)}`)}
                  className="text-sm text-sky-500 hover:text-sky-400 font-medium"
                >
                  View stats
                </button>
              )
            }
          ]}
        />
      </div>
    </div>
  );
}

