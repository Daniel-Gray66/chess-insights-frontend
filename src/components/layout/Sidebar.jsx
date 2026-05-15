
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Swords,
  BookOpen,
  Target,
  LogOut,
  RefreshCw,
} from 'lucide-react';

const sidebarStyle = {
  width: '240px',
  height: '100vh',
  position: 'fixed',
  left: 0,
  top: 0,
  background: 'var(--bg-primary)',
  borderRight: '1px solid var(--border-light)',
  display: 'flex',
  flexDirection: 'column',
  padding: '20px 12px',
  zIndex: 100,
};

const logoStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '0 8px 20px',
  borderBottom: '1px solid var(--border-light)',
  marginBottom: '12px',
};

const userStyle = {
  fontSize: '12px',
  color: 'var(--text-tertiary)',
  padding: '0 8px',
  marginTop: '-12px',
  marginBottom: '12px',
  fontFamily: 'var(--font-mono)',
};

const navStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const navItemBase = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '10px 12px',
  borderRadius: '10px',
  fontSize: '14px',
  color: 'var(--text-secondary)',
  background: 'none',
  border: 'none',
  width: '100%',
  textAlign: 'left',
  textDecoration: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const navItemActive = {
  ...navItemBase,
  background: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
  fontWeight: 500,
};

const footerStyle = {
  borderTop: '1px solid var(--border-light)',
  paddingTop: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/games', icon: Swords, label: 'Games' },
  { to: '/repertoire', icon: BookOpen, label: 'Repertoire' },
  { to: '/drill', icon: Target, label: 'Drill' },
];

export default function Sidebar({ username, onSync, syncing, onLogout }) {
  const handleLogout = () => { if (onLogout) { onLogout(); return; }
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <aside style={sidebarStyle}>
      <div style={logoStyle}>
        <span style={{ fontSize: '24px', lineHeight: 1 }}>♞</span>
        <span style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.02em' }}>
          Chess insights
        </span>
      </div>
      {username && <div style={userStyle}>{username}</div>}

      <nav style={navStyle}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => isActive ? navItemActive : navItemBase}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={footerStyle}>
        <button style={navItemBase} onClick={onSync} disabled={syncing}>
          <RefreshCw size={18} />
          <span>{syncing ? 'Syncing...' : 'Sync games'}</span>
        </button>
        <button style={navItemBase} onClick={handleLogout}>
          <LogOut size={18} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
