import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard/Dashboard';
import RepertoireList from './pages/Repertoire/RepertoireList';
import RepertoireDetail from './pages/Repertoire/RepertoireDetail';
import DrillPage from './pages/Drill/Drill';
import DrillPicker from './pages/Drill/DrillPicker';
import GamesList from './pages/Games/GamesList';
import GameDetail from './pages/Games/GameDetail';
import './styles/global.css';

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return width;
}

function AppLayout({ children }) {
  const [syncing, setSyncing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const username = 'merwinofficial';
  const width = useWindowWidth();
  const collapsed = width < 800;

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { gamesApi } = await import('./services/api');
      await gamesApi.sync();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
      window.location.reload();
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Overlay for mobile sidebar */}
      {collapsed && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 99,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}

      {/* Sidebar - fixed on desktop, slide-in on mobile */}
      <div style={{
        position: 'fixed',
        left: collapsed && !sidebarOpen ? '-260px' : '0',
        top: 0,
        zIndex: 100,
        transition: 'left 0.25s ease',
      }}>
        <Sidebar
          username={username}
          onSync={handleSync}
          syncing={syncing}
        />
      </div>

      {/* Main content */}
      <main style={{
        marginLeft: collapsed ? 0 : '240px',
        flex: 1,
        padding: collapsed ? '16px 20px' : '32px 40px',
        paddingTop: collapsed ? '56px' : '32px',
        transition: 'margin-left 0.25s ease, padding 0.25s ease',
        minWidth: 0,
      }}>
        {/* Mobile hamburger */}
        {collapsed && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              position: 'fixed',
              top: '12px',
              left: '12px',
              zIndex: 98,
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              padding: '8px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: '18px', lineHeight: 1 }}>☰</span>
            <span>Menu</span>
          </button>
        )}

        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/repertoire" element={<RepertoireList />} />
          <Route path="/repertoire/:id" element={<RepertoireDetail />} />
          <Route path="/repertoire/:id/drill" element={<DrillPage />} />
          <Route path="/drill" element={<DrillPicker />} />
          <Route path="/games" element={<GamesList />} />
          <Route path="/games/:id" element={<GameDetail />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

function Placeholder({ title }) {
  return (
    <div style={{ padding: '40px 0' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 8 }}>
        {title}
      </h1>
      <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>
        Coming soon — this page is under construction.
      </p>
    </div>
  );
}