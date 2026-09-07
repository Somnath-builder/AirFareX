import { useEffect, useState } from 'react';
import { Download, Filter, Search } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/Cards';
import { airfareService } from '../services/airfareService';
import type { Observation } from '../types';

export function DataExplorer() {
  const [data, setData] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const result = await airfareService.getObservations();
      setData(result);
      setLoading(false);
    };
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Collected Fare Observations</h1>
          <p className="text-slate-500 mt-1">Raw scraped data points for transparency and verification</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            <Download size={16} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3 bg-slate-50/50">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search origin, destination, airline..."
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Filter size={16} />
            Filters
          </button>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading data...</div>
        ) : (
          <DataTable 
            data={data}
            columns={[
              { header: 'Timestamp', accessor: 'timestamp', className: 'text-slate-500' },
              { header: 'Origin', accessor: 'origin', className: 'font-semibold text-slate-700' },
              { header: 'Dest', accessor: 'destination', className: 'font-semibold text-slate-700' },
              { header: 'Airline', accessor: 'airline' },
              { header: 'Travel Date', accessor: 'travelDate' },
              { header: 'Lead Time', accessor: 'leadTime' },
              { header: 'Class', accessor: 'fareClass', className: 'text-slate-500' },
              { header: 'Base', align: 'right', accessor: (row) => `₹${row.baseFare}` },
              { header: 'Taxes', align: 'right', accessor: (row) => `₹${row.taxes}` },
              { header: 'Fees', align: 'right', accessor: (row) => `₹${row.fees}` },
              { header: 'Total', align: 'right', accessor: (row) => <span className="font-semibold text-slate-900">₹{row.totalFare.toLocaleString('en-IN')}</span> },
              { header: 'Status', align: 'center', accessor: (row) => <StatusBadge status={row.status} /> },
            ]}
          />
        )}
        
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500 bg-slate-50/50">
          <div>Showing 1 to {data.length} of {data.length} entries</div>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-slate-200 rounded bg-white text-slate-400 cursor-not-allowed">Previous</button>
            <button className="px-3 py-1 border border-slate-200 rounded bg-white text-slate-400 cursor-not-allowed">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
