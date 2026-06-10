import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { ShieldCheck, ShieldOff } from 'lucide-react';

// ── Create / Edit User Modal ───────────────────────────────────────────────────
function UserModal({ user, onSave, onClose }) {
  const [form, setForm] = useState({
    name:      user?.name      || '',
    email:     user?.email     || '',
    password:  '',
    role:      user?.role      || 'worker',
    is_active: user?.is_active ?? true,
  });
  const [error,  setError]  = useState('');
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const body = { ...form };
      if (!body.password) delete body.password;
      if (user) await api.put(`/users/${user.id}`, body);
      else      await api.post('/users', body);
      onSave();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={user ? 'Edit User' : 'Create User'} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </>}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Name</label>
          <input className="form-control" value={form.name}
            onChange={e => set('name', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-control" type="email" value={form.email}
            onChange={e => set('email', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">
            {user ? 'New Password (leave blank to keep)' : 'Password'}
          </label>
          <input className="form-control" type="password" value={form.password}
            onChange={e => set('password', e.target.value)} required={!user} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-control" value={form.role}
              onChange={e => set('role', e.target.value)}>
              <option value="worker">Worker</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-control" value={form.is_active}
              onChange={e => set('is_active', e.target.value === 'true')}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
        {error && <div className="error-msg">{error}</div>}
      </form>
    </Modal>
  );
}

// ── Role Change Confirmation Modal ────────────────────────────────────────────
function RoleModal({ target, newRole, onConfirm, onClose }) {
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');

  const promoting = newRole === 'admin';

  async function confirm() {
    setBusy(true); setError('');
    try {
      await onConfirm();
      onClose();
    } catch (e) { setError(e.message); setBusy(false); }
  }

  return (
    <Modal
      title={promoting ? 'Promote to Admin' : 'Demote to Worker'}
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button
          className={`btn ${promoting ? 'btn-primary' : 'btn-danger'}`}
          onClick={confirm}
          disabled={busy}
        >
          {busy
            ? 'Saving…'
            : promoting
              ? 'Yes, Make Admin'
              : 'Yes, Make Worker'}
        </button>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: promoting ? 'var(--accent-dim)' : 'var(--danger-dim)',
            color: promoting ? 'var(--accent)' : 'var(--danger)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {promoting
              ? <ShieldCheck size={24} strokeWidth={1.75} />
              : <ShieldOff  size={24} strokeWidth={1.75} />}
          </div>
        </div>

        <p style={{ fontSize: 14, color: 'var(--text-soft)', textAlign: 'center', lineHeight: 1.6 }}>
          {promoting ? (
            <>
              You are about to give <strong style={{ color: 'var(--text)' }}>{target.name}</strong> full
              admin access — they will be able to manage all users, bundles, proxies, assignments,
              and results.
            </>
          ) : (
            <>
              You are about to remove admin access from{' '}
              <strong style={{ color: 'var(--text)' }}>{target.name}</strong>.
              They will only see their own workspace.
            </>
          )}
        </p>

        {/* Warning box */}
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius)',
          background: promoting ? 'var(--accent-dim)' : 'var(--danger-dim)',
          borderLeft: `3px solid ${promoting ? 'var(--accent)' : 'var(--danger)'}`,
          fontSize: 13, color: promoting ? 'var(--accent)' : 'var(--danger)',
        }}>
          {promoting
            ? 'This grants full system access. Only promote trusted team members.'
            : 'This removes all admin privileges immediately.'}
        </div>
      </div>

      {error && <div className="error-msg" style={{ marginTop: 10 }}>{error}</div>}
    </Modal>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Users() {
  const { user: me } = useAuth();
  const [users,  setUsers]  = useState([]);
  const [modal,  setModal]  = useState(null);
  const [toast,  setToast]  = useState('');   // success message
  const [roleModal, setRoleModal] = useState(null); // { target, newRole }

  function load() { api.get('/users').then(setUsers).catch(console.error); }
  useEffect(load, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function del(id) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
      await api.delete(`/users/${id}`);
      load();
    } catch (e) { alert(e.message); }
  }

  async function changeRole(targetId, newRole) {
    const updated = await api.patch(`/users/${targetId}/role`, { role: newRole });
    load();
    return updated;
  }

  function openRoleModal(target) {
    const newRole = target.role === 'admin' ? 'worker' : 'admin';
    setRoleModal({ target, newRole });
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Users</h1>
        <button className="btn btn-primary" onClick={() => setModal('create')}>+ Add User</button>
      </div>

      {/* Success toast */}
      {toast && (
        <div style={{
          marginBottom: 16, padding: '10px 16px', borderRadius: 'var(--radius)',
          background: 'var(--success-dim)', borderLeft: '3px solid var(--success)',
          fontSize: 13, color: 'var(--success)', fontWeight: 600,
        }}>
          {toast}
        </div>
      )}

      <div className="card">
        {/* Desktop table */}
        <div className="table-wrap hide-mobile">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={6} className="empty">No users yet</td></tr>
              )}
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>
                    {u.name}
                    {u.id === me?.id && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-muted)',
                                     fontWeight: 600 }}>(you)</span>
                    )}
                  </td>
                  <td className="text-muted">{u.email}</td>
                  <td>
                    <span className={`badge badge-${u.role}`}>{u.role}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${u.is_active ? 'active' : 'banned'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="td-actions">
                      {/* Role change — only shown for other users, not yourself */}
                      {u.id !== me?.id && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{
                            color: u.role === 'admin' ? 'var(--danger)' : 'var(--accent)',
                            borderColor: u.role === 'admin' ? 'var(--danger-dim)' : 'var(--accent-dim)',
                            gap: 4,
                          }}
                          onClick={() => openRoleModal(u)}
                          title={u.role === 'admin' ? 'Demote to Worker' : 'Promote to Admin'}
                        >
                          {u.role === 'admin'
                            ? <><ShieldOff  size={12} strokeWidth={2} /> Make Worker</>
                            : <><ShieldCheck size={12} strokeWidth={2} /> Make Admin</>
                          }
                        </button>
                      )}
                      <button className="btn btn-secondary btn-sm" onClick={() => setModal(u)}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => del(u.id)}>
                        Del
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
          {users.length === 0 && <div className="empty">No users yet</div>}
          {users.map(u => (
            <div className="mc-card" key={u.id}>
              <div className="mc-head">
                <div className="mc-head-info">
                  <div className="mc-title">
                    {u.name}
                    {u.id === me?.id && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-muted)',
                                     fontWeight: 600 }}>(you)</span>
                    )}
                  </div>
                  <div className="mc-badges">
                    <span className={`badge badge-${u.role}`}>{u.role}</span>
                    <span className={`badge badge-${u.is_active ? 'active' : 'banned'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mc-meta">
                <div className="mc-meta-item mc-meta-full">
                  <div className="mc-meta-label">Email</div>
                  <div className="mc-meta-value">{u.email}</div>
                </div>
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Joined</div>
                  <div className="mc-meta-value">{new Date(u.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="mc-actions">
                {u.id !== me?.id && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{
                      color: u.role === 'admin' ? 'var(--danger)' : 'var(--accent)',
                      borderColor: u.role === 'admin' ? 'var(--danger-dim)' : 'var(--accent-dim)',
                      gap: 4,
                    }}
                    onClick={() => openRoleModal(u)}
                  >
                    {u.role === 'admin'
                      ? <><ShieldOff  size={12} strokeWidth={2} /> Make Worker</>
                      : <><ShieldCheck size={12} strokeWidth={2} /> Make Admin</>
                    }
                  </button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => setModal(u)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => del(u.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit / Create modal */}
      {modal && (
        <UserModal
          user={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}

      {/* Role change confirmation modal */}
      {roleModal && (
        <RoleModal
          target={roleModal.target}
          newRole={roleModal.newRole}
          onConfirm={async () => {
            await changeRole(roleModal.target.id, roleModal.newRole);
            const verb = roleModal.newRole === 'admin' ? 'promoted to admin' : 'demoted to worker';
            showToast(`${roleModal.target.name} was ${verb}.`);
          }}
          onClose={() => setRoleModal(null)}
        />
      )}
    </div>
  );
}
