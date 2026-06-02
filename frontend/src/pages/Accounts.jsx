import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import Modal from '../components/Modal';

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'threads'];
const STATUSES  = ['warmup', 'active', 'banned'];

function AccountModal({ account, workers, onSave, onClose }) {
  const [form, setForm] = useState({
    user_id:  account?.user_id  || '',
    platform: account?.platform || 'tiktok',
    login:    account?.login    || '',
    status:   account?.status   || 'warmup',
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const body = { ...form, user_id: form.user_id || null };
      if (account) await api.put(`/accounts/${account.id}`, body);
      else         await api.post('/accounts', body);
      onSave();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={account ? 'Edit Account' : 'Add Account'} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
               <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Assigned Worker</label>
          <select className="form-control" value={form.user_id} onChange={e => set('user_id', e.target.value)}>
            <option value="">— Unassigned —</option>
            {workers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Platform</label>
            <select className="form-control" value={form.platform} onChange={e => set('platform', e.target.value)}>
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Login / Username</label>
          <input className="form-control" value={form.login} onChange={e => set('login', e.target.value)} required />
        </div>
        {error && <div className="error-msg">{error}</div>}
      </form>
    </Modal>
  );
}

export default function Accounts() {
  const { user }    = useAuth();
  const isAdmin     = user?.role === 'admin';
  const [accounts, setAccounts]     = useState([]);
  const [workers, setWorkers]       = useState([]);
  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(null);

  function load() {
    const p = new URLSearchParams();
    if (filterUser)   p.set('user_id', filterUser);
    if (filterStatus) p.set('status', filterStatus);
    const q = p.toString() ? '?' + p.toString() : '';
    api.get(`/accounts${q}`).then(setAccounts).catch(console.error);
  }

  useEffect(() => {
    api.get('/users').then(all => setWorkers(all.filter(u => u.role === 'worker')));
  }, []);
  useEffect(load, [filterUser, filterStatus]);

  async function quickReassign(account, user_id) {
    await api.put(`/accounts/${account.id}`, { user_id: user_id || null });
    load();
  }

  async function quickStatus(account, status) {
    await api.put(`/accounts/${account.id}`, { status });
    load();
  }

  async function del(id) {
    if (!confirm('Delete this account?')) return;
    await api.delete(`/accounts/${id}`);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Accounts</h1>
        {isAdmin && <button className="btn btn-primary" onClick={() => setModal('create')}>+ Add Account</button>}
      </div>

      <div className="filter-bar">
        <select className="form-control" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
          <option value="">All Workers</option>
          <option value="unassigned">Unassigned</option>
          {workers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        {/* Desktop table */}
        <div className="table-wrap hide-mobile">
          <table>
            <thead>
              <tr>
                <th>Platform</th><th>Login</th><th>Assigned Worker</th><th>Status</th><th>Created</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 && <tr><td colSpan={6} className="empty">No accounts</td></tr>}
              {accounts.map(a => (
                <tr key={a.id}>
                  <td style={{ textTransform: 'capitalize' }}>{a.platform}</td>
                  <td style={{ fontWeight: 500 }}>{a.login}</td>
                  <td>
                    {isAdmin ? (
                      <select className="form-control" style={{ padding: '3px 6px', width: 'auto', fontSize: 12 }}
                        value={a.user_id || ''} onChange={e => quickReassign(a, e.target.value)}>
                        <option value="">— Unassigned —</option>
                        {workers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    ) : (
                      <span>{a.user_name || <span className="text-muted">Unassigned</span>}</span>
                    )}
                  </td>
                  <td>
                    {isAdmin ? (
                      <select className="form-control" style={{ padding: '3px 6px', width: 'auto', fontSize: 12 }}
                        value={a.status} onChange={e => quickStatus(a, e.target.value)}>
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className={`badge badge-${a.status}`}>{a.status}</span>
                    )}
                  </td>
                  <td className="text-muted">{new Date(a.created_at).toLocaleDateString()}</td>
                  {isAdmin && (
                    <td>
                      <div className="td-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => setModal(a)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => del(a.id)}>Del</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-cards">
          {accounts.length === 0 && <div className="empty">No accounts</div>}
          {accounts.map(a => (
            <div className="mc-card" key={a.id}>
              <div className="mc-head">
                <div className="mc-head-info">
                  <div className="mc-title">{a.login}</div>
                  <div className="mc-badges">
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{a.platform}</span>
                    {!isAdmin && <span className={`badge badge-${a.status}`}>{a.status}</span>}
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="mc-meta" style={{ marginBottom: 10 }}>
                  <div className="mc-meta-item mc-meta-full">
                    <div className="mc-meta-label">Worker</div>
                    <select className="mc-select" value={a.user_id || ''} onChange={e => quickReassign(a, e.target.value)}>
                      <option value="">— Unassigned —</option>
                      {workers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="mc-meta-item mc-meta-full" style={{ marginTop: 8 }}>
                    <div className="mc-meta-label">Status</div>
                    <select className="mc-select" value={a.status} onChange={e => quickStatus(a, e.target.value)}>
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {!isAdmin && (
                <div className="mc-meta">
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Worker</div>
                    <div className="mc-meta-value">{a.user_name || 'Unassigned'}</div>
                  </div>
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Created</div>
                    <div className="mc-meta-value">{new Date(a.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="mc-meta" style={{ marginBottom: 0 }}>
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Created</div>
                    <div className="mc-meta-value">{new Date(a.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="mc-actions" style={{ marginTop: 12 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setModal(a)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => del(a.id)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <AccountModal
          account={modal === 'create' ? null : modal}
          workers={workers}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
