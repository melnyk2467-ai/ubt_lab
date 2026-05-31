import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/users', label: 'Users', icon: '👤' },
  { to: '/accounts', label: 'Accounts', icon: '📱' },
  { to: '/offers', label: 'Offers', icon: '🎯' },
  { to: '/bundles', label: 'Bundles', icon: '📦' },
  { to: '/videos', label: 'Videos', icon: '🎬' },
  { to: '/metrics', label: 'Metrics', icon: '📊' },
  { to: '/tasks', label: 'Tasks', icon: '✓' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">UBT <span>System</span></div>
        <nav className="sidebar-nav">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              <span>{icon}</span> {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <strong>{user?.name}</strong>
          <div style={{ fontSize: 11, marginBottom: 6 }}>{user?.role}</div>
          <button className="logout-btn" onClick={handleLogout}>Log out</button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
