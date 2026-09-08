import { Clock } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Cards';

export function LeadTimeAnalysis() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Lead Time Analysis</h1>
        <p className="text-[#718198] mt-1">Impact of booking window on fare pricing</p>
      </div>

      <Card className="bg-[#101D30] border-[#24344A]">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <Clock className="w-16 h-16 text-slate-600 mb-6" />
          <h2 className="text-xl font-semibold text-white mb-2">Analysis Coming Soon</h2>
          <p className="text-slate-400 text-center max-w-md">
            The FastAPI backend currently focuses on real-time routing and aggregate metrics. 
            Advanced predictive modeling for lead-time impact will be integrated soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
