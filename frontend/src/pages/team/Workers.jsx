import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

function initials(name = '') {
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function Workers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/workers')
      .then(setWorkers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Workers</h1>
        <span className="text-muted" style={{ fontSize: 13 }}>Click a worker to view their profile</span>
      </div>

      <div className="card">
        {/* Desktop table */}
        <div className="table-wrap hide-mobile">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th className="text-right">Accounts</th>
                <th className="text-right">Open Tasks</th>
                <th className="text-right">Active Exps</th>
                <th className="text-right">Videos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="empty">Loading…</td></tr>}
              {!loading && workers.length === 0 && (
                <tr><td colSpan={8} className="empty">No workers yet — create users with role "worker"</td></tr>
              )}
              {workers.map(w => (
                <tr key={w.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/workers/${w.id}`)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-dim)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                        {initials(w.name)}
                      </div>
                      <span style={{ fontWeight: 600 }}>{w.name}</span>
                    </div>
                  </td>
                  <td className="text-muted">{w.email}</td>
                  <td><span className={`badge badge-${w.is_active ? 'active' : 'banned'}`}>{w.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="text-right num">{w.accounts_count}</td>
                  <td className="text-right num">
                    <span style={{ color: w.open_tasks_count > 0 ? 'var(--warning)' : 'inherit' }}>{w.open_tasks_count}</span>
                  </td>
                  <td className="text-right num">
                    <span style={{ color: w.active_experiments_count > 0 ? 'var(--accent)' : 'inherit' }}>{w.active_experiments_count}</span>
                  </td>
                  <td className="text-right num">{w.videos_uploaded}</td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); navigate(`/workers/${w.id}`); }}>
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
            <div className="mc-card" key={w.id} onClick={() => navigate(`/workers/${w.id}`)} style={{ cursor: 'pointer' }}>
              <div className="mc-head">
                <div className="mc-avatar">{initials(w.name)}</div>
                <div className="mc-head-info">
                  <div className="mc-title">{w.name}</div>
                  <div className="mc-badges">
                    <span className={`badge badge-${w.is_active ? 'active' : 'banned'}`}>{w.is_active ? 'Active' : 'Inactive'}</span>
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
                  <div className="mc-stat-value" style={{ color: w.open_tasks_count > 0 ? 'var(--warning)' : 'inherit' }}>{w.open_tasks_count}</div>
                  <div className="mc-stat-label">Tasks</div>
                </div>
                <div className="mc-stat">
                  <div className="mc-stat-value" style={{ color: w.active_experiments_count > 0 ? 'var(--accent)' : 'inherit' }}>{w.active_experiments_count}</div>
                  <div className="mc-stat-label">Exps</div>
                </div>
                <div className="mc-stat">
                  <div className="mc-stat-value">{w.videos_uploaded}</div>
                  <div className="mc-stat-label">Videos</div>
                </div>
              </div>
              <div className="mc-actions">
                <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); navigate(`/workers/${w.id}`); }}>
                  Open Profile →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
