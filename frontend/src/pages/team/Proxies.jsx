import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../api/client';
import Modal from '../../components/Modal';
import { Plus, Pencil, Trash2, Shield } from 'lucide-react';

const TYPES    = ['http', 'socks5', 'mobile', 'residential'];
const STATUSES = ['active', 'inactive', 'banned', 'testing'];

const STATUS_BADGE = {
  active:   'active',
  inactive: 'pending',
  banned:   'banned',
  testing:  'testing',
};

const EMPTY_FORM = {
  name: '', host: '', port: '', username: '', password: '',
  type: 'http', country: '', status: 'active', notes: '',
  visible_to_worker: false,
};

/* ── Proxy form modal ─────────────────────────────────────────────────────── */
function ProxyModal({ initial, workers, accounts, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.name || !form.host || !form.port) { setError('Name, host, and port are required'); return; }
    setSaving(true); setError('');
    try { await onSave(form); onClose(); }
    catch (e) { setError(e.message); setSaving(false); }
  }

  return (
    <Modal title={initial ? 'Edit Proxy' : 'Add Proxy'} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </>}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. US Residential #1" />
        </div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-control" value={form.type} onChange={e => set('type', e.target.value)}>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group" style={{ flex: 2 }}>
          <label className="form-label">Host *</label>
          <input className="form-control" value={form.host} onChange={e => set('host', e.target.value)} placeholder="192.168.1.1 or proxy.example.com" />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Port *</label>
          <input className="form-control" type="number" value={form.port} onChange={e => set('port', e.target.value)} placeholder="8080" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Username</label>
          <input className="form-control" value={form.username} onChange={e => set('username', e.target.value)} autoComplete="off" />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-control" type="password" value={form.password} onChange={e => set('password', e.target.value)} autoComplete="new-password" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Country</label>
          <input className="form-control" value={form.country} onChange={e => set('country', e.target.value)} placeholder="US" />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Assign to Worker</label>
        <select className="form-control" value={form.assigned_worker_id || ''} onChange={e => set('assigned_worker_id', e.target.value || null)}>
          <option value="">— Unassigned —</option>
          {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Assign to Account</label>
        <select className="form-control" value={form.assigned_account_id || ''} onChange={e => set('assigned_account_id', e.target.value || null)}>
          <option value="">— None —</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.platform} / {a.login}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-control" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--text-soft)' }}>
          <input type="checkbox" checked={form.visible_to_worker} onChange={e => set('visible_to_worker', e.target.checked)} />
          Show credentials to assigned worker
        </label>
      </div>
      {error && <div className="error-msg">{error}</div>}
    </Modal>
  );
}

/* ── Confirm delete modal ─────────────────────────────────────────────────── */
function ConfirmModal({ message, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  async function go() { setBusy(true); try { await onConfirm(); onClose(); } catch { setBusy(false); } }
  return (
    <Modal title="Confirm Delete" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" onClick={go} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button>
      </>}>
      <p style={{ color: 'var(--text-soft)', fontSize: 14 }}>{message}</p>
    </Modal>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────────── */
export default function Proxies() {
  const [proxies,  setProxies]  = useState([]);
  const [workers,  setWorkers]  = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);

  // Filters
  const [filterStatus,  setFilterStatus]  = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterWorker,  setFilterWorker]  = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus)  params.set('status',    filterStatus);
    if (filterCountry) params.set('country',   filterCountry);
    if (filterWorker)  params.set('worker_id', filterWorker);
    const qs = params.toString() ? `?${params}` : '';
    Promise.all([
      api.get(`/proxies${qs}`),
      api.get('/workers'),
      api.get('/accounts'),
    ]).then(([p, w, a]) => { setProxies(p); setWorkers(w); setAccounts(a); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterStatus, filterCountry, filterWorker]);

  useEffect(load, [load]);

  async function saveProxy(form) {
    if (form.id) {
      await api.put(`/proxies/${form.id}`, form);
    } else {
      const created = await api.post('/proxies', form);
      // Handle inline worker/account assignment if set in the form
      if (form.assigned_worker_id) {
        await api.post(`/proxies/${created.id}/assign-worker/${form.assigned_worker_id}`, {});
      }
      if (form.assigned_account_id) {
        await api.post(`/proxies/${created.id}/assign-account/${form.assigned_account_id}`, {});
      }
    }
    load();
  }

  async function deleteProxy(id) {
    await api.delete(`/proxies/${id}`);
    load();
  }

  const countries = [...new Set(proxies.map(p => p.country).filter(Boolean))].sort();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <Shield size={20} strokeWidth={1.75} style={{ color: 'var(--accent)', marginRight: 8, verticalAlign: 'middle' }} />
          Proxies
        </h1>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: 'form' })}
          style={{ gap: 6 }}>
          <Plus size={14} strokeWidth={2} /> Add Proxy
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <select className="form-control" style={{ minWidth: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="form-control" style={{ minWidth: 130 }} value={filterCountry} onChange={e => setFilterCountry(e.target.value)}>
          <option value="">All countries</option>
          {countries.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="form-control" style={{ minWidth: 160 }} value={filterWorker} onChange={e => setFilterWorker(e.target.value)}>
          <option value="">All workers</option>
          {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        {(filterStatus || filterCountry || filterWorker) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterStatus(''); setFilterCountry(''); setFilterWorker(''); }}>
            Clear
          </button>
        )}
      </div>

      <div className="card">
        {/* Desktop table */}
        <div className="table-wrap hide-mobile">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Host : Port</th>
                <th>Type</th>
                <th>Country</th>
                <th>Credentials</th>
                <th>Status</th>
                <th>Worker</th>
                <th>Account</th>
                <th>Visible</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10} className="empty">Loading…</td></tr>}
              {!loading && proxies.length === 0 && (
                <tr><td colSpan={10} className="empty">No proxies yet — click Add Proxy</td></tr>
              )}
              {proxies.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td className="text-muted" style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.host}:{p.port}</td>
                  <td><span className="badge badge-pending" style={{ textTransform: 'uppercase', fontSize: 10 }}>{p.type}</span></td>
                  <td className="text-muted">{p.country || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                    {p.username || '—'} / {p.password || '—'}
                  </td>
                  <td><span className={`badge badge-${STATUS_BADGE[p.status]}`}>{p.status}</span></td>
                  <td className="text-muted">{p.worker_name || '—'}</td>
                  <td className="text-muted">
                    {p.account_login ? `${p.account_platform} / ${p.account_login}` : '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {p.visible_to_worker ? <span style={{ color: 'var(--success)', fontSize: 12 }}>Yes</span> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-xs" style={{ gap: 3 }}
                        onClick={() => setModal({ type: 'form', proxy: { ...p, password: '' } })}>
                        <Pencil size={11} strokeWidth={2} /> Edit
                      </button>
                      <button className="btn btn-ghost btn-xs" style={{ color: 'var(--danger)', gap: 3 }}
                        onClick={() => setModal({ type: 'confirm', proxy: p })}>
                        <Trash2 size={11} strokeWidth={2} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-cards">
          {loading && <div className="empty">Loading…</div>}
          {!loading && proxies.length === 0 && <div className="empty">No proxies yet</div>}
          {proxies.map(p => (
            <div className="mc-card" key={p.id}>
              <div className="mc-head">
                <div className="mc-head-info">
                  <div className="mc-title">{p.name}</div>
                  <div className="mc-badges">
                    <span className={`badge badge-${STATUS_BADGE[p.status]}`}>{p.status}</span>
                    <span className="badge badge-pending" style={{ textTransform: 'uppercase', fontSize: 10 }}>{p.type}</span>
                  </div>
                </div>
              </div>
              <div className="mc-meta">
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Host</div>
                  <div className="mc-meta-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.host}:{p.port}</div>
                </div>
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Country</div>
                  <div className="mc-meta-value">{p.country || '—'}</div>
                </div>
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Worker</div>
                  <div className="mc-meta-value">{p.worker_name || '—'}</div>
                </div>
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Account</div>
                  <div className="mc-meta-value">{p.account_login ? `${p.account_platform}/${p.account_login}` : '—'}</div>
                </div>
              </div>
              <div className="mc-actions">
                <button className="btn btn-secondary btn-sm" style={{ gap: 5 }}
                  onClick={() => setModal({ type: 'form', proxy: { ...p, password: '' } })}>
                  <Pencil size={12} strokeWidth={2} /> Edit
                </button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger-dim)', gap: 5 }}
                  onClick={() => setModal({ type: 'confirm', proxy: p })}>
                  <Trash2 size={12} strokeWidth={2} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {modal?.type === 'form' && (
        <ProxyModal
          initial={modal.proxy}
          workers={workers}
          accounts={accounts}
          onSave={saveProxy}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'confirm' && (
        <ConfirmModal
          message={`Delete proxy "${modal.proxy.name}"? This cannot be undone.`}
          onConfirm={() => deleteProxy(modal.proxy.id)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
