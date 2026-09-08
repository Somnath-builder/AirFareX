import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Cards';

export function RouteDetails() {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const decodedRoute = decodeURIComponent(routeId || '');

  return (
    <div className="space-y-6">
      <div>
        <button 
          onClick={() => navigate('/dashboard/routes')}
          className="flex items-center gap-2 text-sm text-[#718198] hover:text-white mb-4"
        >
          <ArrowLeft size={16} />
          Back to Routes
        </button>
        <h1 className="text-2xl font-bold text-white tracking-tight">Route Details: {decodedRoute}</h1>
        <p className="text-[#718198] mt-1">Deep dive into specific corridor performance</p>
      </div>

      <Card className="bg-[#101D30] border-[#24344A]">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <Clock className="w-16 h-16 text-slate-600 mb-6" />
          <h2 className="text-xl font-semibold text-white mb-2">Detailed Analytics Coming Soon</h2>
          <p className="text-slate-400 text-center max-w-md">
            The new FastAPI backend currently provides high-level aggregated data for routes. 
            Deep-dive time series and historical route-specific views will be added in a future API update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
