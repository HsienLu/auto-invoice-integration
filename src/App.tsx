import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import FileManager from './pages/FileManager';
import Analytics from './pages/Analytics';
import PersonalAssets from './pages/PersonalAssets';
import Layout from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineStatus } from './components/OfflineStatus';
import { ErrorNotificationProvider } from './components/ErrorNotificationProvider';

function App() {
  return (
    <ErrorBoundary>
      <ErrorNotificationProvider>
        <Router>
          <OfflineStatus />
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/files" element={<FileManager />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/assets" element={<PersonalAssets />} />
            </Routes>
          </Layout>
        </Router>
      </ErrorNotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
