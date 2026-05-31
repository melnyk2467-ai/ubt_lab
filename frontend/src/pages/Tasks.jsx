import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';

const STATUSES = ['pending', 'in_progress', 'done'];

function TaskModal({ task, users, bundles, onSave, onClose }) {
  const [form, setForm] = useState({
    user_id: task?.user_id || (users[0]?.id || ''),
    bundle_id: task?.bundle_id || (bundles[0]?.id || ''),
    videos_required: task?.videos_required || 1,
    status: task?.status || 'pending',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      if (task) await api.put(`/tasks/${task.id}`, form);
      else await api.post('/tasks', form);
      onSave();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={task ? 'Edit Task' : 'Create Task'} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Assign to Worker</label>
          <select className="form-control" value={form.user_id} onChange={e => set('user_id', e.target.value)} required>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
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
            <input className="form-control" type="number" min="1" value={form.videos_required} onChange={e => set('videos_required', parseInt(e.target.value))} />
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
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [filterUser, setFilterUser] = useState('');
  const [modal, setModal] = useState(null);

  function load() {
    const q = filterUser ? `?user_id=${filterUser}` : '';
    api.get(`/tasks${q}`).then(setTasks).catch(console.error);
  }

  useEffect(() => {
    api.get('/users').then(setUsers);
    api.get('/bundles').then(setBundles);
  }, []);
  useEffect(load, [filterUser]);

  async function quickStatus(task, status) {
    await api.put(`/tasks/${task.id}`, { status });
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
        <button className="btn btn-primary" onClick={() => setModal('create')}>+ Create Task</button>
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
              <tr><th>Worker</th><th>Bundle</th><th>Videos Required</th><th>Status</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {tasks.length === 0 && <tr><td colSpan={6} className="empty">No tasks yet</td></tr>}
              {tasks.map(t => (
                <tr key={t.id}>
                  <td>{t.user_name}</td>
                  <td>{t.bundle_name}</td>
                  <td className="num">{t.videos_required}</td>
                  <td>
                    <select
                      className="form-control"
                      style={{ padding: '3px 6px', width: 'auto', fontSize: 12 }}
                      value={t.status}
                      onChange={e => quickStatus(t, e.target.value)}
                    >
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="text-muted">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td><div className="td-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setModal(t)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => del(t.id)}>Del</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <TaskModal
          task={modal === 'create' ? null : modal}
          users={users}
          bundles={bundles}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
