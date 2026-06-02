import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import Modal from '../components/Modal';

const STATUSES = ['pending', 'in_progress', 'done'];
const STATUS_BADGE = { pending: 'pending', in_progress: 'testing', done: 'active' };
const STATUS_LABEL = { pending: 'Pending', in_progress: 'In Progress', done: 'Done' };

function TaskModal({ task, workers, bundles, onSave, onClose }) {
  const [form, setForm] = useState({
    user_id:         task?.user_id         || (workers[0]?.id || ''),
    bundle_id:       task?.bundle_id       || (bundles[0]?.id || ''),
    videos_required: task?.videos_required || 1,
    status:          task?.status          || 'pending',
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      if (task) await api.put(`/tasks/${task.id}`, form);
      else      await api.post('/tasks', form);
      onSave();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={task ? 'Edit Task' : 'Create Task'} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
               <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Assign to Worker</label>
          <select className="form-control" value={form.user_id} onChange={e => set('user_id', e.target.value)} required>
            {workers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Bundle</label>
          <select className="form-control" value={form.bundle_id} onChange={e => set('bundle_id', e.target.value)} required>
            {bundles.map(b => <option key={b.id} value={b.id}>{b.name} ({b.offer_name})</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Videos Required</label>
            <input className="form-control" type="number" min="1" value={form.videos_required}
              onChange={e => set('videos_required', parseInt(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {error && <div className="error-msg">{error}</div>}
      </form>
    </Modal>
  );
}

export default function Tasks() {
  const { user }  = useAuth();
  const isAdmin   = user?.role === 'admin';
  const [tasks, setTasks]     = useState([]);
  const [workers, setWorkers] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [filterUser,   setFilterUser]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBundle, setFilterBundle] = useState('');
  const [modal, setModal] = useState(null);

  function load() {
    const p = new URLSearchParams();
    if (filterUser)   p.set('user_id', filterUser);
    if (filterStatus) p.set('status',  filterStatus);
    if (filterBundle) p.set('bundle_id', filterBundle);
    const q = p.toString() ? '?' + p.toString() : '';
    api.get(`/tasks${q}`).then(setTasks).catch(console.error);
  }

  useEffect(() => {
    api.get('/users').then(all => setWorkers(all.filter(u => u.role === 'worker')));
    api.get('/bundles').then(setBundles);
  }, []);
  useEffect(load, [filterUser, filterStatus, filterBundle]);

  async function quickStatus(task, status) {
    await api.put(`/tasks/${task.id}`, { status });
    load();
  }

  async function quickAssign(task, user_id) {
    await api.put(`/tasks/${task.id}`, { user_id });
    load();
  }

  async function del(id) {
    if (!confirm('Delete this task?')) return;
    await api.delete(`/tasks/${id}`);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tasks</h1>
        {isAdmin && <button className="btn btn-primary" onClick={() => setModal('create')}>+ Create Task</button>}
      </div>

      <div className="filter-bar">
        <select className="form-control" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
          <option value="">All Workers</option>
          {workers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="form-control" value={filterBundle} onChange={e => setFilterBundle(e.target.value)}>
          <option value="">All Bundles</option>
          {bundles.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className="card">
        {/* Desktop table */}
        <div className="table-wrap hide-mobile">
          <table>
            <thead>
              <tr>
                <th>Worker</th><th>Bundle</th><th className="text-right">Videos Req.</th>
                <th>Status</th><th>Created</th>{isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 && <tr><td colSpan={6} className="empty">No tasks yet</td></tr>}
              {tasks.map(t => (
                <tr key={t.id}>
                  <td>
                    {isAdmin ? (
                      <select className="form-control" style={{ padding: '3px 6px', width: 'auto', fontSize: 12 }}
                        value={t.user_id} onChange={e => quickAssign(t, e.target.value)}>
                        {workers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    ) : t.user_name}
                  </td>
                  <td>{t.bundle_name}</td>
                  <td className="text-right num">{t.videos_required}</td>
                  <td>
                    {isAdmin ? (
                      <select className="form-control" style={{ padding: '3px 6px', width: 'auto', fontSize: 12 }}
                        value={t.status} onChange={e => quickStatus(t, e.target.value)}>
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className={`badge badge-${STATUS_BADGE[t.status] || t.status}`}>{t.status}</span>
                    )}
                  </td>
                  <td className="text-muted">{new Date(t.created_at).toLocaleDateString()}</td>
                  {isAdmin && (
                    <td>
                      <div className="td-actions">
                        {t.status !== 'done' && (
                          <button className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--success)', borderColor: 'var(--success)' }}
                            onClick={() => quickStatus(t, 'done')}>
                            ✓ Done
                          </button>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={() => setModal(t)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => del(t.id)}>Del</button>
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
          {tasks.length === 0 && <div className="empty">No tasks yet</div>}
          {tasks.map(t => (
            <div className="mc-card" key={t.id}>
              <div className="mc-head">
                <div className="mc-head-info">
                  <div className="mc-title">{t.bundle_name || '—'}</div>
                  <div className="mc-badges">
                    {!isAdmin && <span className={`badge badge-${STATUS_BADGE[t.status] || t.status}`}>{STATUS_LABEL[t.status] || t.status}</span>}
                  </div>
                </div>
              </div>

              {isAdmin ? (
                <div className="mc-meta" style={{ marginBottom: 10 }}>
                  <div className="mc-meta-item mc-meta-full">
                    <div className="mc-meta-label">Worker</div>
                    <select className="mc-select" value={t.user_id} onChange={e => quickAssign(t, e.target.value)}>
                      {workers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="mc-meta-item mc-meta-full" style={{ marginTop: 8 }}>
                    <div className="mc-meta-label">Status</div>
                    <select className="mc-select" value={t.status} onChange={e => quickStatus(t, e.target.value)}>
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Videos Required</div>
                    <div className="mc-meta-value">{t.videos_required}</div>
                  </div>
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Created</div>
                    <div className="mc-meta-value">{new Date(t.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ) : (
                <div className="mc-meta">
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Worker</div>
                    <div className="mc-meta-value">{t.user_name}</div>
                  </div>
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Videos Req.</div>
                    <div className="mc-meta-value">{t.videos_required}</div>
                  </div>
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Created</div>
                    <div className="mc-meta-value">{new Date(t.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="mc-actions">
                  {t.status !== 'done' && (
                    <button className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--success)', borderColor: 'var(--success)' }}
                      onClick={() => quickStatus(t, 'done')}>
                      ✓ Done
                    </button>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => setModal(t)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => del(t.id)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <TaskModal
          task={modal === 'create' ? null : modal}
          workers={workers}
          bundles={bundles}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
