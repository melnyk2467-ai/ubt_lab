import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'setup'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.post('/auth/login', { email: form.email, password: form.password });
        login(res.token, res.user);
        navigate('/');
      } else {
        await api.post('/auth/setup', form);
        setMode('login');
        setError('Admin created — please log in.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-box" onSubmit={submit}>
        <div className="login-title">UBT System</div>
        <div className="login-sub">
          {mode === 'login' ? 'Sign in to your account' : 'Create first admin account'}
        </div>

        {mode === 'setup' && (
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-control" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-control" type="password" value={form.password} onChange={e => set('password', e.target.value)} required />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button className="btn btn-primary" style={{ width: '100%', marginTop: 16, justifyContent: 'center' }} disabled={loading}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Admin'}
        </button>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          {mode === 'login' ? (
            <>First time? <button type="button" style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12 }} onClick={() => setMode('setup')}>Set up admin account</button></>
          ) : (
            <button type="button" style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12 }} onClick={() => setMode('login')}>Back to login</button>
          )}
        </div>
      </form>
    </div>
  );
}
