import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './services/supabase';
import api, { setAuthToken } from './services/api';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard/Dashboard';
import RepertoireList from './pages/Repertoire/RepertoireList';
import RepertoireDetail from './pages/Repertoire/RepertoireDetail';
import DrillPage from './pages/Drill/Drill';
import DrillPicker from './pages/Drill/DrillPicker';
import GamesList from './pages/Games/GamesList';
import GameDetail from './pages/Games/GameDetail';
import Community from './pages/Community/Community';
import CommunityRepertoireView from './pages/Community/CommunityRepertoireView';
import Login from './pages/Auth/Login';
import AuthCallback from './pages/Auth/AuthCallback';
import AccountSetup from './pages/Auth/AccountSetup';
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

function RequireAuth({ children, session, userProfile, loading }) {
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', color: 'var(--text-tertiary)', fontSize: '14px',
      }}>
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (userProfile?.needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  return children;
}

function RedirectIfAuth({ children, session, userProfile }) {
  if (session && userProfile && !userProfile.needsSetup) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppLayout({ children, userProfile, onLogout }) {
  const [syncing, setSyncing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const username = userProfile?.chessComUsername || userProfile?.username || '';
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
      {collapsed && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)', zIndex: 99,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}

      <div style={{
        position: 'fixed',
        left: collapsed && !sidebarOpen ? '-260px' : '0',
        top: 0, zIndex: 100,
        transition: 'left 0.25s ease',
      }}>
        <Sidebar
          username={username}
          onSync={handleSync}
          syncing={syncing}
          onLogout={onLogout}
        />
      </div>

      <main style={{
        marginLeft: collapsed ? 0 : '240px',
        flex: 1,
        padding: collapsed ? '16px 20px' : '32px 40px',
        paddingTop: collapsed ? '56px' : '32px',
        transition: 'margin-left 0.25s ease, padding 0.25s ease',
        minWidth: 0,
      }}>
        {collapsed && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              position: 'fixed', top: '12px', left: '12px', zIndex: 98,
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: '8px', padding: '8px 10px',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              gap: '6px', fontSize: '13px', color: 'var(--text-secondary)',
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
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async () => {
    try {
      const res = await api.get('/v1/auth/me');
      setUserProfile(res.data);
      if (res.data.chessComUsername) {
        localStorage.setItem('chessComUsername', res.data.chessComUsername);
        localStorage.setItem('username', res.data.username);
      }
      return res.data;
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      return null;
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthToken(session?.access_token || null);
      if (session) {
        fetchUserProfile().then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setAuthToken(session?.access_token || null);
        if (session) {
          await fetchUserProfile();
        } else {
          setUserProfile(null);
          localStorage.removeItem('chessComUsername');
          localStorage.removeItem('username');
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserProfile(null);
    setAuthToken(null);
    localStorage.removeItem('chessComUsername');
    localStorage.removeItem('username');
  };

  const handleSetupComplete = (profile) => {
    setUserProfile(profile);
    if (profile.chessComUsername) {
      localStorage.setItem('chessComUsername', profile.chessComUsername);
      localStorage.setItem('username', profile.username);
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          <RedirectIfAuth session={session} userProfile={userProfile}><Login /></RedirectIfAuth>
        } />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/setup" element={
          session ? (
            <AccountSetup onSetupComplete={handleSetupComplete} />
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/*" element={
          <RequireAuth session={session} userProfile={userProfile} loading={loading}>
            <AppLayout userProfile={userProfile} onLogout={handleLogout}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/games" element={<GamesList />} />
                <Route path="/games/:id" element={<GameDetail />} />
                <Route path="/repertoire" element={<RepertoireList />} />
                <Route path="/repertoire/:id" element={<RepertoireDetail />} />
                <Route path="/repertoire/:id/drill" element={<DrillPage />} />
                <Route path="/drill" element={<DrillPicker />} />
                <Route path="/community" element={<Community />} />
                <Route path="/community/:id" element={<CommunityRepertoireView />} />
              </Routes>
            </AppLayout>
          </RequireAuth>
        } />
      </Routes>
    </BrowserRouter>
  );
}