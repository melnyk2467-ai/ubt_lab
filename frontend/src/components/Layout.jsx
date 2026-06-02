import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { NAV } from '../config/navigation';

const STORAGE_KEY = 'ubt-nav-groups';

const ICON_PROPS = { size: 15, strokeWidth: 1.75 };

function NavIcon({ icon: Icon }) {
  if (!Icon) return null;
  return <Icon {...ICON_PROPS} />;
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function isRouteActive(to, pathname) {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(to + '/');
}

function groupHasActive(group, pathname) {
  return group.items.some(item => isRouteActive(item.to, pathname));
}

// ── Admin: collapsible nav group ─────────────────────────────────────────────
function NavGroup({ group, open, hasActive, onToggle, onLinkClick }) {
  return (
    <div className="nav-group">
      <button
        className={`nav-group-header${hasActive ? ' has-active' : ''}`}
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="nav-link-icon"><NavIcon icon={group.icon} /></span>
        <span className="nav-group-label">{group.label}</span>
        <span className={`nav-group-chevron${open ? ' open' : ''}`}>
          <ChevronRight size={13} strokeWidth={2} />
        </span>
      </button>

      <div className={`nav-group-items${open ? ' open' : ''}`}>
        <div className="nav-group-track" />
        {group.items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => 'nav-link nav-group-item' + (isActive ? ' active' : '')}
            onClick={onLinkClick}
          >
            <span className="nav-link-icon"><NavIcon icon={item.icon} /></span>
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

// ── Layout ───────────────────────────────────────────────────────────────────
export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  function isOpen(label) { return openGroups[label] !== false; }

  function toggleGroup(label) {
    setOpenGroups(prev => {
      const next = { ...prev, [label]: !isOpen(label) };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  useEffect(() => {
    if (user?.role !== 'admin') return;
    NAV.forEach(item => {
      if (item.type === 'group' && groupHasActive(item, location.pathname)) {
        setOpenGroups(prev => {
          if (prev[item.label] === true) return prev;
          const next = { ...prev, [item.label]: true };
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
          return next;
        });
      }
    });
  }, [location.pathname, user?.role]);

  function handleLogout() { logout(); navigate('/login'); }
  function closeMenu()    { setMenuOpen(false); }

  function canSee(roles) {
    if (!roles) return true;
    return roles.includes(user?.role);
  }

  const visibleNav = NAV
    .filter(item => canSee(item.roles))
    .map(item =>
      item.type === 'group'
        ? { ...item, items: item.items.filter(i => canSee(i.roles)) }
        : item
    )
    .filter(item => item.type !== 'group' || item.items.length > 0);

  const workerFlatNav = visibleNav.flatMap(item => {
    if (item.type === 'link')  return [{ to: item.to, label: item.label, icon: item.icon, exact: true }];
    if (item.type === 'group') return item.items.map(i => ({ to: i.to, label: i.workerLabel || i.label, icon: i.icon, exact: false }));
    return [];
  });

  const isWorker = user?.role === 'worker';

  return (
    <div className="layout">
      {/* Mobile hamburger */}
      <button
        className="sidebar-hamburger"
        onClick={() => setMenuOpen(o => !o)}
        aria-label="Toggle menu"
      >
        {menuOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
      </button>

      <div className={`sidebar-overlay${menuOpen ? ' open' : ''}`} onClick={closeMenu} />

      <aside className={`sidebar${menuOpen ? ' open' : ''}`}>
        {/* Logo + controls */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">UBT <span>Lab</span></div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark'
                ? <Sun size={15} strokeWidth={1.75} />
                : <Moon size={15} strokeWidth={1.75} />}
            </button>
            <button className="sidebar-close" onClick={closeMenu} aria-label="Close menu">
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        <nav className="sidebar-nav">
          {isWorker ? (
            <>
              <div className="sidebar-section-label">My Workspace</div>
              {workerFlatNav.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
                  onClick={closeMenu}
                >
                  <span className="nav-link-icon"><NavIcon icon={item.icon} /></span>
                  {item.label}
                </NavLink>
              ))}
            </>
          ) : (
            visibleNav.map(item => {
              if (item.type === 'link') {
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end
                    className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
                    onClick={closeMenu}
                  >
                    <span className="nav-link-icon"><NavIcon icon={item.icon} /></span>
                    {item.label}
                  </NavLink>
                );
              }
              if (item.type === 'group') {
                return (
                  <NavGroup
                    key={item.label}
                    group={item}
                    open={isOpen(item.label)}
                    hasActive={groupHasActive(item, location.pathname)}
                    onToggle={() => toggleGroup(item.label)}
                    onLinkClick={closeMenu}
                  />
                );
              }
              return null;
            })
          )}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials(user?.name)}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
          </div>
          <div className="sidebar-footer-btns">
            <button className="logout-btn" onClick={handleLogout}>Log out</button>
          </div>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
