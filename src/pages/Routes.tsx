import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { TrendIndicator } from '../components/ui/Cards';
import { airfareService } from '../services/airfareService';
import type { RouteStats } from '../types';

export function Routes() {
  const [routes, setRoutes] = useState<RouteStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      const data = await airfareService.getRoutes();
      setRoutes(data);
      setLoading(false);
    };
    loadData();
  }, []);

  const filteredRoutes = routes.filter(r => 
    r.route.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="animate-pulse h-96 bg-slate-200 rounded-xl"></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Routes Overview</h1>
          <p className="text-slate-500 mt-1">Airfare movement across monitored domestic corridors</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search routes..."
              className="pl-9 pr-4 py-2 border border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border border-slate-800 rounded-lg text-sm font-medium text-slate-300 hover:bg-black">
            <SlidersHorizontal size={16} />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <DataTable 
          data={filteredRoutes}
          columns={[
            { 
              header: 'Route', 
              accessor: (row) => (
                <button 
                  onClick={() => navigate(`/routes/${encodeURIComponent(row.route)}`)}
                  className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  {row.route}
                </button>
              )
            },
            { 
              header: 'Avg Fare', 
              align: 'right', 
              accessor: (row) => <span className="font-medium text-slate-200">₹{row.avgFare.toLocaleString('en-IN')}</span> 
            },
            { 
              header: 'Daily Change', 
              align: 'right', 
              accessor: (row) => <TrendIndicator value={row.dailyChange} suffix="%" inverse /> 
            },
            { 
              header: 'Weekly Change', 
              align: 'right', 
              accessor: (row) => <TrendIndicator value={row.weeklyChange} suffix="%" inverse /> 
            },
            { 
              header: 'Monthly Change', 
              align: 'right', 
              accessor: (row) => <TrendIndicator value={row.monthlyChange} suffix="%" inverse /> 
            },
            {
              header: 'Action',
              align: 'center',
              accessor: (row) => (
                <button 
                  onClick={() => navigate(`/routes/${encodeURIComponent(row.route)}`)}
                  className="text-sm text-slate-500 hover:text-indigo-600 font-medium"
                >
                  View details
                </button>
              )
            }
          ]}
        />
      </div>
    </div>
  );
}
