import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'threads'];
const STATUSES = ['warmup', 'active', 'banned'];

function AccountModal({ account, users, onSave, onClose }) {
  const [form, setForm] = useState({
    user_id: account?.user_id || (users[0]?.id || ''),
    platform: account?.platform || 'tiktok',
    login: account?.login || '',
    status: account?.status || 'warmup',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      if (account) await api.put(`/accounts/${account.id}`, form);
      else await api.post('/accounts', form);
      onSave();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={account ? 'Edit Account' : 'Add Account'} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Worker</label>
          <select className="form-control" value={form.user_id} onChange={e => set('user_id', e.target.value)} required>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
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
  const [accounts, setAccounts] = useState([]);
  const [users, setUsers] = useState([]);
  const [filterUser, setFilterUser] = useState('');
  const [modal, setModal] = useState(null);

  function load() {
    const q = filterUser ? `?user_id=${filterUser}` : '';
    api.get(`/accounts${q}`).then(setAccounts).catch(console.error);
  }

  useEffect(() => { api.get('/users').then(setUsers); }, []);
  useEffect(load, [filterUser]);

  async function del(id) {
    if (!confirm('Delete this account?')) return;
    await api.delete(`/accounts/${id}`);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Accounts</h1>
        <button className="btn btn-primary" onClick={() => setModal('create')}>+ Add Account</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <select className="form-control" style={{ width: 200 }} value={filterUser} onChange={e => setFilterUser(e.target.value)}>
          <option value="">All Workers</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Worker</th><th>Platform</th><th>Login</th><th>Status</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {accounts.length === 0 && <tr><td colSpan={6} className="empty">No accounts</td></tr>}
              {accounts.map(a => (
                <tr key={a.id}>
                  <td>{a.user_name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{a.platform}</td>
                  <td>{a.login}</td>
                  <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                  <td className="text-muted">{new Date(a.created_at).toLocaleDateString()}</td>
                  <td><div className="td-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setModal(a)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => del(a.id)}>Del</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <AccountModal
          account={modal === 'create' ? null : modal}
          users={users}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
