import { Server, Database, LineChart, Globe, Terminal } from 'lucide-react';
import { Card } from '../components/ui/Cards';

export function Methodology() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Methodology</h1>
        <p className="text-slate-500 mt-2 text-lg">Architecture and mathematical foundation of the India Airfare Price Index.</p>
      </div>

      <div className="prose prose-slate max-w-none">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-200 mt-8 mb-4">
          <Globe className="text-indigo-500" />
          1. Data Collection
        </h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          The proposed system employs automated web scraping to collect real-time airfare observations from major Indian airline portals and select Online Travel Aggregators (OTAs). 
          The data is scraped without manual intervention at scheduled intervals to capture dynamic pricing strategies.
        </p>

        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2 mt-6">Route Basket</h3>
        <p className="text-slate-600 leading-relaxed mb-4">
          A representative basket of city-pairs is selected based on DGCA passenger traffic data. This ensures the index accurately reflects the prices paid by the majority of domestic flyers.
        </p>

        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2 mt-6">Booking Windows</h3>
        <p className="text-slate-600 leading-relaxed mb-4">
          To account for lead-time elasticity, fares are sampled at specific intervals prior to departure:
        </p>
        <div className="flex gap-2 mb-6">
          {['T+1', 'T+3', 'T+7', 'T+15', 'T+30', 'T+45'].map(t => (
            <span key={t} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-md font-mono text-sm">{t}</span>
          ))}
        </div>

        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-200 mt-10 mb-4">
          <Database className="text-indigo-500" />
          2. Data Processing Pipeline
        </h2>
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 my-4">
          <div className="flex flex-col gap-4">
            {['Raw Fare Collection', 'Validation & Cleansing', 'Deduplication', 'Outlier Detection', 'Fare Normalisation'].map((step, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-full max-w-md bg-white border border-slate-200 p-3 rounded-lg text-center font-medium text-slate-700 shadow-sm">
                  {step}
                </div>
                {idx < 4 && <div className="h-6 w-px bg-slate-300 my-1"></div>}
              </div>
            ))}
          </div>
        </div>

        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-200 mt-10 mb-4">
          <LineChart className="text-indigo-500" />
          3. Index Construction
        </h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          The index utilizes a Laspeyres-type formula, where current period prices are compared against a fixed base period. 
          Route-level price relatives are aggregated using fixed weights derived from passenger volume share.
        </p>
        <div className="bg-slate-900 rounded-xl p-6 my-4 overflow-x-auto">
          <code className="text-emerald-400 font-mono text-sm whitespace-pre">
            {`I(t) = Σ (P_i,t / P_i,0) * W_i * 100`}
            <br/><br/>
            {`Where:`}
            <br/>
            {`I(t)   = Index at time t`}
            <br/>
            {`P_i,t  = Price for route i at time t`}
            <br/>
            {`P_i,0  = Price for route i in base period 0`}
            <br/>
            {`W_i    = Weight for route i (Σ W_i = 1)`}
          </code>
        </div>

        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-200 mt-10 mb-4">
          <Server className="text-indigo-500" />
          4. Future API Specification
        </h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          When the backend is implemented, this frontend will decouple from the mock data layer and consume the following RESTful endpoints:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          {[
            { method: 'GET', endpoint: '/api/v1/index' },
            { method: 'GET', endpoint: '/api/v1/routes' },
            { method: 'GET', endpoint: '/api/v1/routes/{id}' },
            { method: 'GET', endpoint: '/api/v1/airlines' },
            { method: 'GET', endpoint: '/api/v1/observations' },
            { method: 'GET', endpoint: '/api/v1/lead-time' },
          ].map(api => (
            <Card key={api.endpoint} className="p-4 flex items-center gap-3">
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                {api.method}
              </span>
              <code className="text-sm text-slate-700">{api.endpoint}</code>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
