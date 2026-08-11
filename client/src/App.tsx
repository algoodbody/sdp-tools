import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RequestsPage from './pages/RequestsPage';
import SettingsPage from './pages/SettingsPage';
import LogsPage from './pages/LogsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<RequestsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/logs" element={<LogsPage />} />
      </Route>
    </Routes>
  );
}
