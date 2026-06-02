import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Login() {
  const [mode, setMode]   = useState('login'); // 'login' | 'setup'
  const [form, setForm]   = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo]   = useState('');
  const [loading, setLoading] = useState(false);

  // Whether any users already exist in the database.
  // Defaults to true so the setup link is hidden until we confirm otherwise.
  const [hasUsers, setHasUsers] = useState(true);

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // On mount: ask the backend if setup has already been done.
  // If no users exist, the setup link becomes visible.
  useEffect(() => {
    api.get('/auth/status')
      .then(d => setHasUsers(d.has_users))
      .catch(() => setHasUsers(true)); // on error default to "has users" — safer
  }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.post('/auth/login', { email: form.email, password: form.password });
        login(res.token, res.user);
        navigate('/');
      } else {
        await api.post('/auth/setup', form);
        setMode('login');
        setHasUsers(true); // setup just created the first user
        setInfo('Admin account created — please log in.');
        setForm(f => ({ ...f, name: '' }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-box" onSubmit={submit} noValidate>

        {/* Logo + theme toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div className="login-logo">UBT <span>Lab</span></div>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>

        <div className="login-sub">
          {mode === 'login' ? 'Sign in to your account' : 'Create first admin account'}
        </div>

        {/* Setup-only field */}
        {mode === 'setup' && (
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              className="form-control"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Your name"
              required
              autoFocus
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="form-control"
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus={mode === 'login'}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            className="form-control"
            type="password"
            value={form.password}
            onChange={e => set('password', e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        {error && <div className="error-msg">{error}</div>}
        {info  && <div className="success-msg">{info}</div>}

        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 20, padding: '13px 18px', fontSize: 15, minHeight: 50, borderRadius: 'var(--radius-lg)' }}
          disabled={loading}
        >
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Admin Account'}
        </button>

        {/* Setup link — only visible when no users exist yet */}
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          {mode === 'login' ? (
            // Show "Set up admin account" only if the DB has no users yet
            !hasUsers && (
              <>
                First time?{' '}
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  onClick={() => { setMode('setup'); setError(''); setInfo(''); }}
                >
                  Set up admin account
                </button>
              </>
            )
          ) : (
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              onClick={() => { setMode('login'); setError(''); setInfo(''); }}
            >
              ← Back to sign in
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
