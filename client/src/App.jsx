import { Routes, Route } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/dashboard/:fileId" element={<DashboardPage />} />
      </Routes>
    </div>
  );
}
