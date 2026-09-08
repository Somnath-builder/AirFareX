import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
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
      <Routes>
        <Route path="/" element={<Home />} />
        
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="index" element={<AirfareIndex />} />
          <Route path="routes" element={<RoutesPage />} />
          <Route path="routes/:routeId" element={<RouteDetails />} />
          <Route path="airlines" element={<Airlines />} />
          <Route path="lead-time" element={<LeadTimeAnalysis />} />
          <Route path="explorer" element={<DataExplorer />} />
          <Route path="methodology" element={<Methodology />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
