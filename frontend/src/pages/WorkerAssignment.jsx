import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Modal from '../components/Modal';
import {
  UserCircle, CheckSquare, FlaskConical,
  Plus, Trash2, ArrowLeft, Shield,
} from 'lucide-react';

/* ─── helpers ────────────────────────────────────────────────────────────── */
function fmt(n) {
  n = parseInt(n) || 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}
function initials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

const TASK_STATUS_BADGE = { pending: 'pending', in_progress: 'testing', done: 'active' };
const TASK_STATUSES     = ['pending', 'in_progress', 'done'];

/* ─── Section card wrapper ───────────────────────────────────────────────── */
function Section({ icon: Icon, title, count, action, children }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={16} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
          <span style={{
            background: 'var(--accent-dim)', color: 'var(--accent)',
            borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700,
          }}>{count}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ─── Empty state for a section ─────────────────────────────────────────── */
function SectionEmpty({ label }) {
  return (
    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      No {label} assigned yet
    </div>
  );
}

/* ─── Assign Account Modal ───────────────────────────────────────────────── */
function AssignAccountModal({ pool, onAssign, onClose }) {
  const [selected, setSelected] = useState(pool[0]?.id || '');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  async function submit() {
    if (!selected) return;
    setSaving(true); setError('');
    try { await onAssign(selected); onClose(); }
    catch (e) { setError(e.message); setSaving(false); }
  }

  return (
    <Modal title="Assign Account" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving || !pool.length}>
          {saving ? 'Assigning…' : 'Assign'}
        </button>
      </>}>
      {pool.length === 0 ? (
        <div className="text-muted" style={{ fontSize: 13 }}>
          No unassigned accounts available. Unassign one from another worker first.
        </div>
      ) : (
        <div className="form-group">
          <label className="form-label">Select Account</label>
          <select className="form-control" value={selected} onChange={e => setSelected(e.target.value)}>
            {pool.map(a => (
              <option key={a.id} value={a.id}>
                {a.platform} / {a.login} — {a.status}
              </option>
            ))}
          </select>
        </div>
      )}
      {error && <div className="error-msg">{error}</div>}
    </Modal>
  );
}

/* ─── Create Task Modal ──────────────────────────────────────────────────── */
function CreateTaskModal({ bundles, onCreate, onClose }) {
  const [form, setForm] = useState({
    bundle_id:       bundles[0]?.id || '',
    videos_required: 1,
    status:          'pending',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.bundle_id) { setError('Select a bundle'); return; }
    setSaving(true); setError('');
    try { await onCreate(form); onClose(); }
    catch (e) { setError(e.message); setSaving(false); }
  }

  return (
    <Modal title="Assign New Task" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving || !bundles.length}>
          {saving ? 'Creating…' : 'Create & Assign'}
        </button>
      </>}>
      {bundles.length === 0 ? (
        <div className="text-muted" style={{ fontSize: 13 }}>No active bundles available.</div>
      ) : (
        <>
          <div className="form-group">
            <label className="form-label">Bundle</label>
            <select className="form-control" value={form.bundle_id} onChange={e => set('bundle_id', e.target.value)}>
              {bundles.map(b => <option key={b.id} value={b.id}>{b.name} ({b.offer_name})</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Videos Required</label>
              <input className="form-control" type="number" min="1" value={form.videos_required}
                onChange={e => set('videos_required', parseInt(e.target.value) || 1)} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
                {TASK_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </>
      )}
      {error && <div className="error-msg">{error}</div>}
    </Modal>
  );
}

/* ─── Assign Experiment Modal ────────────────────────────────────────────── */
function AssignExpModal({ pool, onAssign, onClose }) {
  const [selected, setSelected] = useState(pool[0]?.id || '');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  async function submit() {
    if (!selected) return;
    setSaving(true); setError('');
    try { await onAssign(selected); onClose(); }
    catch (e) { setError(e.message); setSaving(false); }
  }

  return (
    <Modal title="Assign Experiment" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving || !pool.length}>
          {saving ? 'Assigning…' : 'Assign'}
        </button>
      </>}>
      {pool.length === 0 ? (
        <div className="text-muted" style={{ fontSize: 13 }}>
          No unassigned experiments available.
        </div>
      ) : (
        <div className="form-group">
          <label className="form-label">Select Experiment</label>
          <select className="form-control" value={selected} onChange={e => setSelected(e.target.value)}>
            {pool.map(e => (
              <option key={e.id} value={e.id}>
                {e.hypothesis_title}{e.bundle_name ? ` — ${e.bundle_name}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}
      {error && <div className="error-msg">{error}</div>}
    </Modal>
  );
}

/* ─── Assign Proxy Modal ─────────────────────────────────────────────────── */
function AssignProxyModal({ pool, onAssign, onClose }) {
  const [selected, setSelected] = useState(pool[0]?.id || '');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  async function submit() {
    if (!selected) return;
    setSaving(true); setError('');
    try { await onAssign(selected); onClose(); }
    catch (e) { setError(e.message); setSaving(false); }
  }

  return (
    <Modal title="Assign Proxy" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving || !pool.length}>
          {saving ? 'Assigning…' : 'Assign'}
        </button>
      </>}>
      {pool.length === 0 ? (
        <div className="text-muted" style={{ fontSize: 13 }}>
          No unassigned proxies available. Create proxies in Team → Proxies first.
        </div>
      ) : (
        <div className="form-group">
          <label className="form-label">Select Proxy</label>
          <select className="form-control" value={selected} onChange={e => setSelected(e.target.value)}>
            {pool.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.type}{p.country ? ` (${p.country})` : ''} — {p.status}
              </option>
            ))}
          </select>
        </div>
      )}
      {error && <div className="error-msg">{error}</div>}
    </Modal>
  );
}

/* ─── Confirm delete ─────────────────────────────────────────────────────── */
function ConfirmModal({ message, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try { await onConfirm(); onClose(); }
    catch { setBusy(false); }
  }
  return (
    <Modal title="Confirm" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" onClick={go} disabled={busy}>
          {busy ? 'Removing…' : 'Remove'}
        </button>
      </>}>
      <p style={{ color: 'var(--text-soft)', fontSize: 14 }}>{message}</p>
    </Modal>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function WorkerAssignment() {
  const { workerId } = useParams();
  const navigate     = useNavigate();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [modal, setModal]     = useState(null); // 'account' | 'task' | 'experiment' | 'proxy' | { type:'confirm', … }

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/assignment-center/${workerId}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [workerId]);

  useEffect(load, [load]);

  if (loading && !data) return <div className="text-muted" style={{ padding: 40 }}>Loading…</div>;
  if (error)            return <div className="error-msg" style={{ margin: 24 }}>{error}</div>;
  if (!data)            return null;

  const { worker: w, accounts, tasks, experiments, pool_accounts, pool_experiments, bundles, proxies = [], pool_proxies = [] } = data;

  /* ── actions ─────────────────────────────────────────────────────────── */
  async function assignAccount(accountId) {
    await api.post(`/assignment-center/${workerId}/accounts/${accountId}`, {});
    load();
  }
  async function removeAccount(accountId) {
    await api.delete(`/assignment-center/${workerId}/accounts/${accountId}`);
    load();
  }
  async function createTask(form) {
    await api.post(`/assignment-center/${workerId}/tasks`, form);
    load();
  }
  async function removeTask(taskId) {
    await api.delete(`/assignment-center/${workerId}/tasks/${taskId}`);
    load();
  }
  async function assignExp(expId) {
    await api.post(`/assignment-center/${workerId}/experiments/${expId}`, {});
    load();
  }
  async function removeExp(expId) {
    await api.delete(`/assignment-center/${workerId}/experiments/${expId}`);
    load();
  }
  async function assignProxy(proxyId) {
    await api.post(`/assignment-center/${workerId}/proxies/${proxyId}`, {});
    load();
  }
  async function removeProxy(proxyId) {
    await api.delete(`/assignment-center/${workerId}/proxies/${proxyId}`);
    load();
  }

  function confirm(message, onConfirm) {
    setModal({ type: 'confirm', message, onConfirm });
  }

  return (
    <div>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }}
        onClick={() => navigate('/assignment-center')}>
        <ArrowLeft size={14} strokeWidth={2} />
        Back to Assignment Center
      </button>

      {/* Worker header */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, boxShadow: '0 3px 12px var(--accent-glow)',
          }}>
            {initials(w.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>{w.name}</div>
            <div style={{ display: 'flex', gap: 7, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="text-muted" style={{ fontSize: 13 }}>{w.email}</span>
              <span className={`badge badge-${w.role}`}>{w.role}</span>
              <span className={`badge badge-${w.is_active ? 'active' : 'banned'}`}>
                {w.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          {/* Quick summary */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Accounts',    value: accounts.length },
              { label: 'Tasks',       value: tasks.length },
              { label: 'Experiments', value: experiments.length },
              { label: 'Proxies',     value: proxies.length },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Accounts block ──────────────────────────────────────────────── */}
      <Section
        icon={UserCircle}
        title="Assigned Accounts"
        count={accounts.length}
        action={
          <button className="btn btn-secondary btn-sm" onClick={() => setModal('account')}
            style={{ gap: 5 }}>
            <Plus size={13} strokeWidth={2} /> Assign Account
          </button>
        }
      >
        {accounts.length === 0 ? <SectionEmpty label="accounts" /> : (
          <>
            {/* Desktop table */}
            <div className="table-wrap hide-mobile">
              <table>
                <thead>
                  <tr><th>Platform</th><th>Login</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {accounts.map(a => (
                    <tr key={a.id}>
                      <td style={{ textTransform: 'capitalize' }}>{a.platform}</td>
                      <td style={{ fontWeight: 500 }}>{a.login}</td>
                      <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                      <td>
                        <button className="btn btn-ghost btn-xs"
                          style={{ color: 'var(--danger)', gap: 4 }}
                          onClick={() => confirm(
                            `Remove account "${a.login}" from ${w.name}? The account will become unassigned.`,
                            () => removeAccount(a.id)
                          )}>
                          <Trash2 size={12} strokeWidth={2} /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="mobile-cards">
              {accounts.map(a => (
                <div className="mc-card" key={a.id}>
                  <div className="mc-head">
                    <div className="mc-head-info">
                      <div className="mc-title">{a.login}</div>
                      <div className="mc-badges">
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{a.platform}</span>
                        <span className={`badge badge-${a.status}`}>{a.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mc-actions">
                    <button className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger-dim)' }}
                      onClick={() => confirm(
                        `Remove account "${a.login}" from ${w.name}?`,
                        () => removeAccount(a.id)
                      )}>
                      <Trash2 size={13} strokeWidth={2} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* ── Tasks block ─────────────────────────────────────────────────── */}
      <Section
        icon={CheckSquare}
        title="Assigned Tasks"
        count={tasks.length}
        action={
          <button className="btn btn-secondary btn-sm" onClick={() => setModal('task')}
            style={{ gap: 5 }}>
            <Plus size={13} strokeWidth={2} /> Assign Task
          </button>
        }
      >
        {tasks.length === 0 ? <SectionEmpty label="tasks" /> : (
          <>
            {/* Desktop table */}
            <div className="table-wrap hide-mobile">
              <table>
                <thead>
                  <tr><th>Bundle</th><th className="text-right">Videos Req.</th><th>Status</th><th>Created</th><th></th></tr>
                </thead>
                <tbody>
                  {tasks.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>{t.bundle_name || '—'}</td>
                      <td className="text-right num">{t.videos_required}</td>
                      <td><span className={`badge badge-${TASK_STATUS_BADGE[t.status] || t.status}`}>{t.status}</span></td>
                      <td className="text-muted">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-ghost btn-xs"
                          style={{ color: 'var(--danger)', gap: 4 }}
                          onClick={() => confirm(
                            `Delete task "${t.bundle_name}" assigned to ${w.name}? This cannot be undone.`,
                            () => removeTask(t.id)
                          )}>
                          <Trash2 size={12} strokeWidth={2} /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="mobile-cards">
              {tasks.map(t => (
                <div className="mc-card" key={t.id}>
                  <div className="mc-head">
                    <div className="mc-head-info">
                      <div className="mc-title">{t.bundle_name || '—'}</div>
                      <div className="mc-badges">
                        <span className={`badge badge-${TASK_STATUS_BADGE[t.status] || t.status}`}>{t.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mc-meta" style={{ marginBottom: 0 }}>
                    <div className="mc-meta-item">
                      <div className="mc-meta-label">Videos Req.</div>
                      <div className="mc-meta-value">{t.videos_required}</div>
                    </div>
                    <div className="mc-meta-item">
                      <div className="mc-meta-label">Created</div>
                      <div className="mc-meta-value">{new Date(t.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="mc-actions">
                    <button className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger-dim)' }}
                      onClick={() => confirm(
                        `Delete task "${t.bundle_name}"?`,
                        () => removeTask(t.id)
                      )}>
                      <Trash2 size={13} strokeWidth={2} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* ── Experiments block ────────────────────────────────────────────── */}
      <Section
        icon={FlaskConical}
        title="Assigned Experiments"
        count={experiments.length}
        action={
          <button className="btn btn-secondary btn-sm" onClick={() => setModal('experiment')}
            style={{ gap: 5 }}>
            <Plus size={13} strokeWidth={2} /> Assign Experiment
          </button>
        }
      >
        {experiments.length === 0 ? <SectionEmpty label="experiments" /> : (
          <>
            {/* Desktop table */}
            <div className="table-wrap hide-mobile">
              <table>
                <thead>
                  <tr><th>Hypothesis</th><th>Bundle</th><th>Status</th><th>Start</th><th>End</th><th></th></tr>
                </thead>
                <tbody>
                  {experiments.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.hypothesis_title}
                      </td>
                      <td className="text-muted">{e.bundle_name || '—'}</td>
                      <td>
                        <span className={`badge badge-${e.status === 'active' ? 'testing' : 'active'}`}>{e.status}</span>
                      </td>
                      <td className="text-muted">{e.start_date ? new Date(e.start_date).toLocaleDateString() : '—'}</td>
                      <td className="text-muted">{e.end_date   ? new Date(e.end_date).toLocaleDateString()   : '—'}</td>
                      <td>
                        <button className="btn btn-ghost btn-xs"
                          style={{ color: 'var(--danger)', gap: 4 }}
                          onClick={() => confirm(
                            `Unassign experiment "${e.hypothesis_title}" from ${w.name}?`,
                            () => removeExp(e.id)
                          )}>
                          <Trash2 size={12} strokeWidth={2} /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="mobile-cards">
              {experiments.map(e => (
                <div className="mc-card" key={e.id}>
                  <div className="mc-head">
                    <div className="mc-head-info">
                      <div className="mc-title" style={{ whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 14 }}>
                        {e.hypothesis_title}
                      </div>
                      <div className="mc-badges" style={{ marginTop: 4 }}>
                        <span className={`badge badge-${e.status === 'active' ? 'testing' : 'active'}`}>{e.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mc-meta" style={{ marginBottom: 0 }}>
                    <div className="mc-meta-item">
                      <div className="mc-meta-label">Bundle</div>
                      <div className="mc-meta-value">{e.bundle_name || '—'}</div>
                    </div>
                    <div className="mc-meta-item">
                      <div className="mc-meta-label">Start</div>
                      <div className="mc-meta-value">{e.start_date ? new Date(e.start_date).toLocaleDateString() : '—'}</div>
                    </div>
                  </div>
                  <div className="mc-actions">
                    <button className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger-dim)' }}
                      onClick={() => confirm(
                        `Unassign this experiment from ${w.name}?`,
                        () => removeExp(e.id)
                      )}>
                      <Trash2 size={13} strokeWidth={2} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* ── Proxies block ───────────────────────────────────────────────── */}
      <Section
        icon={Shield}
        title="Assigned Proxies"
        count={proxies.length}
        action={
          <button className="btn btn-secondary btn-sm" onClick={() => setModal('proxy')}
            style={{ gap: 5 }}>
            <Plus size={13} strokeWidth={2} /> Assign Proxy
          </button>
        }
      >
        {proxies.length === 0 ? <SectionEmpty label="proxies" /> : (
          <>
            {/* Desktop table */}
            <div className="table-wrap hide-mobile">
              <table>
                <thead>
                  <tr><th>Name</th><th>Type</th><th>Country</th><th>Status</th><th>Account</th><th></th></tr>
                </thead>
                <tbody>
                  {proxies.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{p.name}</td>
                      <td><span className="badge badge-pending" style={{ textTransform: 'uppercase', fontSize: 10 }}>{p.type}</span></td>
                      <td className="text-muted">{p.country || '—'}</td>
                      <td><span className={`badge badge-${p.status === 'active' ? 'active' : p.status === 'banned' ? 'banned' : 'pending'}`}>{p.status}</span></td>
                      <td className="text-muted">{p.account_login ? `${p.account_platform}/${p.account_login}` : '—'}</td>
                      <td>
                        <button className="btn btn-ghost btn-xs"
                          style={{ color: 'var(--danger)', gap: 4 }}
                          onClick={() => confirm(
                            `Unassign proxy "${p.name}" from ${w.name}?`,
                            () => removeProxy(p.id)
                          )}>
                          <Trash2 size={12} strokeWidth={2} /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="mobile-cards">
              {proxies.map(p => (
                <div className="mc-card" key={p.id}>
                  <div className="mc-head">
                    <div className="mc-head-info">
                      <div className="mc-title">{p.name}</div>
                      <div className="mc-badges">
                        <span className={`badge badge-${p.status === 'active' ? 'active' : p.status === 'banned' ? 'banned' : 'pending'}`}>{p.status}</span>
                        <span className="badge badge-pending" style={{ textTransform: 'uppercase', fontSize: 10 }}>{p.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mc-meta" style={{ marginBottom: 0 }}>
                    <div className="mc-meta-item">
                      <div className="mc-meta-label">Country</div>
                      <div className="mc-meta-value">{p.country || '—'}</div>
                    </div>
                    <div className="mc-meta-item">
                      <div className="mc-meta-label">Account</div>
                      <div className="mc-meta-value">{p.account_login ? `${p.account_platform}/${p.account_login}` : '—'}</div>
                    </div>
                  </div>
                  <div className="mc-actions">
                    <button className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger-dim)' }}
                      onClick={() => confirm(
                        `Unassign proxy "${p.name}" from ${w.name}?`,
                        () => removeProxy(p.id)
                      )}>
                      <Trash2 size={13} strokeWidth={2} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {modal === 'account' && (
        <AssignAccountModal
          pool={pool_accounts}
          onAssign={assignAccount}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'task' && (
        <CreateTaskModal
          bundles={bundles}
          onCreate={createTask}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'experiment' && (
        <AssignExpModal
          pool={pool_experiments}
          onAssign={assignExp}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'proxy' && (
        <AssignProxyModal
          pool={pool_proxies}
          onAssign={assignProxy}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'confirm' && (
        <ConfirmModal
          message={modal.message}
          onConfirm={modal.onConfirm}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
