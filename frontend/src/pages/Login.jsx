import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

// mode: 'login' | 'register' | 'setup'
export default function Login() {
  const [mode,    setMode]    = useState('login');
  const [form,    setForm]    = useState({ name: '', email: '', password: '', confirm: '' });
  const [error,   setError]   = useState('');
  const [info,    setInfo]    = useState('');
  const [loading, setLoading] = useState(false);
  const [hasUsers, setHasUsers] = useState(true);

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/auth/status')
      .then(d => setHasUsers(d.has_users))
      .catch(() => setHasUsers(true));
  }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function switchMode(next) {
    setMode(next);
    setError('');
    setInfo('');
    setForm({ name: '', email: '', password: '', confirm: '' });
  }

  async function submit(e) {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.post('/auth/login', { email: form.email, password: form.password });
        login(res.token, res.user);
        navigate('/');

      } else if (mode === 'register') {
        // Client-side validation before hitting the server
        if (!form.name.trim())          throw new Error('Full name is required');
        if (!form.email.trim())         throw new Error('Email is required');
        if (form.password.length < 8)   throw new Error('Password must be at least 8 characters');
        if (form.password !== form.confirm) throw new Error('Passwords do not match');

        const res = await api.post('/auth/register', {
          name:     form.name.trim(),
          email:    form.email.trim(),
          password: form.password,
        });
        // Auto sign-in
        login(res.token, res.user);
        navigate('/');

      } else {
        // setup mode (first-run admin creation)
        await api.post('/auth/setup', form);
        switchMode('login');
        setHasUsers(true);
        setInfo('Admin account created — please log in.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const titles = {
    login:    'Sign in to your account',
    register: 'Create a worker account',
    setup:    'Create first admin account',
  };

  const buttonLabels = {
    login:    'Sign In',
    register: 'Create Account',
    setup:    'Create Admin Account',
  };

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

        <div className="login-sub">{titles[mode]}</div>

        {/* Full Name — register + setup */}
        {(mode === 'register' || mode === 'setup') && (
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              className="form-control"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Your full name"
              required
              autoFocus
            />
          </div>
        )}

        {/* Email */}
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

        {/* Password */}
        <div className="form-group">
          <label className="form-label">
            Password
            {mode === 'register' && (
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6, fontSize: 11 }}>
                min. 8 characters
              </span>
            )}
          </label>
          <input
            className="form-control"
            type="password"
            value={form.password}
            onChange={e => set('password', e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        {/* Confirm Password — register only */}
        {mode === 'register' && (
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              className="form-control"
              type="password"
              value={form.confirm}
              onChange={e => set('confirm', e.target.value)}
              placeholder="••••••••"
              required
            />
            {/* Inline mismatch hint */}
            {form.confirm && form.password !== form.confirm && (
              <div style={{ marginTop: 5, fontSize: 12, color: 'var(--danger)' }}>
                Passwords do not match
              </div>
            )}
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}
        {info  && <div className="success-msg">{info}</div>}

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 20, padding: '13px 18px', fontSize: 15, minHeight: 50, borderRadius: 'var(--radius-lg)' }}
          disabled={loading || (mode === 'register' && form.confirm && form.password !== form.confirm)}
        >
          {loading ? 'Please wait…' : buttonLabels[mode]}
        </button>

        {/* Mode switcher links */}
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          {mode === 'login' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              <span>
                New to UBT Lab?{' '}
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  onClick={() => switchMode('register')}
                >
                  Create account
                </button>
              </span>
              {/* Setup link — only if no users exist */}
              {!hasUsers && (
                <span>
                  First time?{' '}
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                    onClick={() => switchMode('setup')}
                  >
                    Set up admin account
                  </button>
                </span>
              )}
            </div>
          )}

          {mode === 'register' && (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                onClick={() => switchMode('login')}
              >
                Sign in
              </button>
            </span>
          )}

          {mode === 'setup' && (
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              onClick={() => switchMode('login')}
            >
              ← Back to sign in
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
