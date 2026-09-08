import { Database } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Cards';

export function DataExplorer() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Data Explorer</h1>
        <p className="text-[#718198] mt-1">Raw observation data and export capabilities</p>
      </div>

      <Card className="bg-[#101D30] border-[#24344A]">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <Database className="w-16 h-16 text-slate-600 mb-6" />
          <h2 className="text-xl font-semibold text-white mb-2">Raw Data Export Disabled</h2>
          <p className="text-slate-400 text-center max-w-md">
            Direct database querying has been temporarily disabled while transitioning to the new FastAPI backend.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
