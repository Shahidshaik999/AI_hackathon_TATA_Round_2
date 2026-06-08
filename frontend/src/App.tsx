import { BrowserRouter, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import EquipmentPage from './pages/EquipmentPage';
import DiagnosisPage from './pages/DiagnosisPage';
import AlertsPage from './pages/AlertsPage';
import ChatPage from './pages/ChatPage';
import ReportsPage from './pages/ReportsPage';
import KnowledgePage from './pages/KnowledgePage';
import SparePartsPage from './pages/SparePartsPage';
import LogbookPage from './pages/LogbookPage';
import PriorityPage from './pages/PriorityPage';
import { alertApi } from './api';

/**
 * KeepAlive router — renders all pages simultaneously but shows only the active one.
 * State is preserved across navigation. Pages only unmount when the app reloads.
 */
function KeepAliveRoutes() {
  const location = useLocation();
  const path = location.pathname;

  const pages: { route: string; exact?: boolean; element: React.ReactNode }[] = [
    { route: '/',             exact: true, element: <Dashboard /> },
    { route: '/priority',    element: <PriorityPage /> },
    { route: '/equipment',   element: <EquipmentPage /> },
    { route: '/diagnosis',   element: <DiagnosisPage /> },
    { route: '/alerts',      element: <AlertsPage /> },
    { route: '/chat',        element: <ChatPage /> },
    { route: '/logbook',     element: <LogbookPage /> },
    { route: '/spare-parts', element: <SparePartsPage /> },
    { route: '/reports',     element: <ReportsPage /> },
    { route: '/knowledge',   element: <KnowledgePage /> },
  ];

  const isActive = (route: string, exact?: boolean) => {
    if (exact) return path === route;
    return path === route || path.startsWith(route + '/');
  };

  return (
    <>
      {pages.map(({ route, exact, element }) => (
        <div
          key={route}
          style={{ display: isActive(route, exact) ? 'block' : 'none' }}
        >
          {element}
        </div>
      ))}
    </>
  );
}

export default function App() {
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await alertApi.stats();
        setAlertCount(res.data.active || 0);
      } catch {}
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#f3f4f6',
            border: '1px solid #374151',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#1f2937' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#1f2937' } },
        }}
      />
      <Layout alertCount={alertCount}>
        <KeepAliveRoutes />
      </Layout>
    </BrowserRouter>
  );
}
