import { Routes, Route } from 'react-router-dom';
import CrawlerConsole from '../pages/CrawlerConsole';
import Dashboard from '../pages/Dashboard';
import Rankings from '../pages/Rankings';
import Celebrities from '../pages/Celebrities';
import DramaDetail from '../pages/DramaDetail';
import Settings from '../pages/Settings';
import DataManagement from '../pages/DataManagement';

const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/crawler" element={<CrawlerConsole />} />
      <Route path="/rankings" element={<Rankings />} />
      <Route path="/celebrities" element={<Celebrities />} />
      <Route path="/drama/:id" element={<DramaDetail />} />
      <Route path="/data-management" element={<DataManagement />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
};

export default AppRouter;