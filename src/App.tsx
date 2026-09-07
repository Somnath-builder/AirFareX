import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Overview } from './pages/Overview';
import { AirfareIndex } from './pages/AirfareIndex';
import { Routes as RoutesPage } from './pages/Routes';
import { RouteDetails } from './pages/RouteDetails';
import { Airlines } from './pages/Airlines';
import { LeadTimeAnalysis } from './pages/LeadTimeAnalysis';
import { DataExplorer } from './pages/DataExplorer';
import { Methodology } from './pages/Methodology';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/index" element={<AirfareIndex />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/routes/:routeId" element={<RouteDetails />} />
          <Route path="/airlines" element={<Airlines />} />
          <Route path="/lead-time" element={<LeadTimeAnalysis />} />
          <Route path="/explorer" element={<DataExplorer />} />
          <Route path="/methodology" element={<Methodology />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
