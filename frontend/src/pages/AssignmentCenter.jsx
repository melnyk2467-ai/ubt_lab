import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import {
  UserCircle, CheckSquare, FlaskConical,
  PlaySquare, Eye, ArrowRight,
} from 'lucide-react';

function fmt(n) {
  n = parseInt(n) || 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function StatPill({ icon: Icon, value, label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <Icon size={13} strokeWidth={1.75} style={{ color: color || 'var(--text-muted)', flexShrink: 0 }} />
      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: color || 'var(--text-soft)', fontSize: 13 }}>
        {value}
      </span>
      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</span>
    </div>
  );
}

export default function AssignmentCenter() {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/assignment-center')
      .then(setWorkers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-muted" style={{ padding: 40 }}>Loading…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Assignment Center</h1>
          <div className="page-subtitle">Manage worker assignments — accounts, tasks and experiments</div>
        </div>
      </div>

      {workers.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-icon">👥</div>
            <div className="empty-title">No workers yet</div>
            <div className="empty-desc">Create users with the "worker" role to start managing assignments.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {workers.map(w => (
            <div
              key={w.id}
              className="card"
              style={{ cursor: 'default', display: 'flex', flexDirection: 'column', gap: 0 }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, boxShadow: '0 2px 8px var(--accent-glow)',
                }}>
                  {initials(w.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {w.name}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                    <span className={`badge badge-${w.role}`}>{w.role}</span>
                    <span className={`badge badge-${w.is_active ? 'active' : 'banned'}`}>
                      {w.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                padding: '12px 14px', background: 'var(--surface-2)',
                borderRadius: 'var(--radius)', marginBottom: 16,
              }}>
                <StatPill icon={UserCircle}  value={w.accounts_count}           label="accounts" />
                <StatPill icon={CheckSquare} value={w.open_tasks_count}         label="open tasks"
                  color={w.open_tasks_count > 0 ? 'var(--warning)' : undefined} />
                <StatPill icon={FlaskConical} value={w.active_experiments_count} label="experiments"
                  color={w.active_experiments_count > 0 ? 'var(--accent)' : undefined} />
                <StatPill icon={PlaySquare}  value={w.videos_uploaded}          label="videos" />
                <StatPill icon={Eye}         value={fmt(w.total_views)}         label="views"
                  color={parseInt(w.total_views) > 0 ? 'var(--success)' : undefined} />
              </div>

              {/* Action */}
              <button
                className="btn btn-primary"
                style={{ width: '100%', gap: 8 }}
                onClick={() => navigate(`/assignment-center/${w.id}`)}
              >
                Manage Assignments
                <ArrowRight size={14} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
