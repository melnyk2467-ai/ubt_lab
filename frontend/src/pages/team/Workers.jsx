import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/Modal';
import { ShieldCheck, ShieldOff } from 'lucide-react';

function initials(name = '') {
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

// ── Role change confirmation modal ────────────────────────────────────────────
function RoleModal({ target, newRole, onConfirm, onClose }) {
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');
  const promoting = newRole === 'admin';

  async function confirm() {
    setBusy(true); setError('');
    try { await onConfirm(); onClose(); }
    catch (e) { setError(e.message); setBusy(false); }
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
          {busy ? 'Saving…' : promoting ? 'Yes, Make Admin' : 'Yes, Make Worker'}
        </button>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: promoting ? 'var(--accent-dim)' : 'var(--danger-dim)',
            color:      promoting ? 'var(--accent)'     : 'var(--danger)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {promoting
              ? <ShieldCheck size={24} strokeWidth={1.75} />
              : <ShieldOff  size={24} strokeWidth={1.75} />}
          </div>
        </div>

        <p style={{ fontSize: 14, color: 'var(--text-soft)', textAlign: 'center', lineHeight: 1.6 }}>
          {promoting ? (
            <>You are about to give <strong style={{ color: 'var(--text)' }}>{target.name}</strong> full
            admin access — they will be able to manage all users, bundles, proxies, assignments, and results.</>
          ) : (
            <>You are about to remove admin access from <strong style={{ color: 'var(--text)' }}>{target.name}</strong>.
            They will only see their own workspace.</>
          )}
        </p>

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
export default function Workers() {
  const { user: me } = useAuth();
  const navigate     = useNavigate();

  const [workers,   setWorkers]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [roleModal, setRoleModal] = useState(null); // { target, newRole }
  const [toast,     setToast]     = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/workers')
      .then(setWorkers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function openRoleModal(w) {
    const newRole = w.role === 'admin' ? 'worker' : 'admin';
    setRoleModal({ target: w, newRole });
  }

  async function applyRoleChange(targetId, newRole) {
    await api.patch(`/users/${targetId}/role`, { role: newRole });
    load();
  }

  const COLS = 10; // colspan for empty/loading rows

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Workers</h1>
        <span className="text-muted" style={{ fontSize: 13 }}>Click a row to view their profile</span>
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
                <th className="text-right">Accounts</th>
                <th className="text-right">Open Tasks</th>
                <th className="text-right">Active Exps</th>
                <th className="text-right">Videos</th>
                <th>Actions</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={COLS} className="empty">Loading…</td></tr>}
              {!loading && workers.length === 0 && (
                <tr><td colSpan={COLS} className="empty">
                  No workers yet — create users with role "worker"
                </td></tr>
              )}
              {workers.map(w => (
                <tr key={w.id} style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/workers/${w.id}`)}>

                  {/* Name */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--accent-dim)', color: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800,
                      }}>
                        {initials(w.name)}
                      </div>
                      <span style={{ fontWeight: 600 }}>{w.name}</span>
                      {w.id === me?.id && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>(you)</span>
                      )}
                    </div>
                  </td>

                  <td className="text-muted">{w.email}</td>

                  {/* Role badge */}
                  <td>
                    <span className={`badge badge-${w.role}`}>{w.role}</span>
                  </td>

                  <td>
                    <span className={`badge badge-${w.is_active ? 'active' : 'banned'}`}>
                      {w.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td className="text-right num">{w.accounts_count}</td>
                  <td className="text-right num">
                    <span style={{ color: w.open_tasks_count > 0 ? 'var(--warning)' : 'inherit' }}>
                      {w.open_tasks_count}
                    </span>
                  </td>
                  <td className="text-right num">
                    <span style={{ color: w.active_experiments_count > 0 ? 'var(--accent)' : 'inherit' }}>
                      {w.active_experiments_count}
                    </span>
                  </td>
                  <td className="text-right num">{w.videos_uploaded}</td>

                  {/* Role change button — hidden for own row */}
                  <td onClick={e => e.stopPropagation()}>
                    {w.id !== me?.id && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{
                          gap: 4,
                          color:        w.role === 'admin' ? 'var(--danger)' : 'var(--accent)',
                          borderColor:  w.role === 'admin' ? 'var(--danger-dim)' : 'var(--accent-dim)',
                        }}
                        onClick={() => openRoleModal(w)}
                        title={w.role === 'admin' ? 'Demote to Worker' : 'Promote to Admin'}
                      >
                        {w.role === 'admin'
                          ? <><ShieldOff  size={12} strokeWidth={2} /> Make Worker</>
                          : <><ShieldCheck size={12} strokeWidth={2} /> Make Admin</>
                        }
                      </button>
                    )}
                  </td>

                  {/* Profile link */}
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/workers/${w.id}`)}>
                      Profile →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-cards">
          {loading && <div className="empty">Loading…</div>}
          {!loading && workers.length === 0 && <div className="empty">No workers yet</div>}
          {workers.map(w => (
            <div className="mc-card" key={w.id}
              onClick={() => navigate(`/workers/${w.id}`)}
              style={{ cursor: 'pointer' }}>

              <div className="mc-head">
                <div className="mc-avatar">{initials(w.name)}</div>
                <div className="mc-head-info">
                  <div className="mc-title">
                    {w.name}
                    {w.id === me?.id && (
                      <span style={{ marginLeft: 6, fontSize: 11,
                                     color: 'var(--text-muted)', fontWeight: 600 }}>(you)</span>
                    )}
                  </div>
                  <div className="mc-badges">
                    <span className={`badge badge-${w.role}`}>{w.role}</span>
                    <span className={`badge badge-${w.is_active ? 'active' : 'banned'}`}>
                      {w.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mc-meta">
                <div className="mc-meta-item mc-meta-full">
                  <div className="mc-meta-label">Email</div>
                  <div className="mc-meta-value">{w.email}</div>
                </div>
              </div>

              <div className="mc-stats">
                <div className="mc-stat">
                  <div className="mc-stat-value">{w.accounts_count}</div>
                  <div className="mc-stat-label">Accounts</div>
                </div>
                <div className="mc-stat">
                  <div className="mc-stat-value"
                    style={{ color: w.open_tasks_count > 0 ? 'var(--warning)' : 'inherit' }}>
                    {w.open_tasks_count}
                  </div>
                  <div className="mc-stat-label">Tasks</div>
                </div>
                <div className="mc-stat">
                  <div className="mc-stat-value"
                    style={{ color: w.active_experiments_count > 0 ? 'var(--accent)' : 'inherit' }}>
                    {w.active_experiments_count}
                  </div>
                  <div className="mc-stat-label">Exps</div>
                </div>
                <div className="mc-stat">
                  <div className="mc-stat-value">{w.videos_uploaded}</div>
                  <div className="mc-stat-label">Videos</div>
                </div>
              </div>

              <div className="mc-actions" onClick={e => e.stopPropagation()}>
                {w.id !== me?.id && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{
                      gap: 4,
                      color:       w.role === 'admin' ? 'var(--danger)' : 'var(--accent)',
                      borderColor: w.role === 'admin' ? 'var(--danger-dim)' : 'var(--accent-dim)',
                    }}
                    onClick={() => openRoleModal(w)}
                  >
                    {w.role === 'admin'
                      ? <><ShieldOff  size={12} strokeWidth={2} /> Make Worker</>
                      : <><ShieldCheck size={12} strokeWidth={2} /> Make Admin</>
                    }
                  </button>
                )}
                <button className="btn btn-secondary btn-sm"
                  onClick={() => navigate(`/workers/${w.id}`)}>
                  Open Profile →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role change modal */}
      {roleModal && (
        <RoleModal
          target={roleModal.target}
          newRole={roleModal.newRole}
          onConfirm={async () => {
            await applyRoleChange(roleModal.target.id, roleModal.newRole);
            const verb = roleModal.newRole === 'admin' ? 'promoted to Admin' : 'demoted to Worker';
            showToast(`${roleModal.target.name} was ${verb}.`);
          }}
          onClose={() => setRoleModal(null)}
        />
      )}
    </div>
  );
}
