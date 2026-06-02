import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Shield } from 'lucide-react';

const STATUS_BADGE = {
  active:   'active',
  inactive: 'pending',
  banned:   'banned',
  testing:  'testing',
};

export default function MyProxies() {
  const [proxies, setProxies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/proxies')
      .then(setProxies)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <Shield size={20} strokeWidth={1.75} style={{ color: 'var(--accent)', marginRight: 8, verticalAlign: 'middle' }} />
          My Proxies
        </h1>
      </div>

      <div className="card">
        {/* Desktop table */}
        <div className="table-wrap hide-mobile">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Host</th>
                <th>Port</th>
                <th>Type</th>
                <th>Country</th>
                <th>Username</th>
                <th>Password</th>
                <th>Status</th>
                <th>Account</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="empty">Loading…</td></tr>}
              {!loading && proxies.length === 0 && (
                <tr><td colSpan={9} className="empty">No proxies assigned to you yet</td></tr>
              )}
              {proxies.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.host}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.port}</td>
                  <td><span className="badge badge-pending" style={{ textTransform: 'uppercase', fontSize: 10 }}>{p.type}</span></td>
                  <td className="text-muted">{p.country || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                    {p.username || '—'}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                    {p.password || '—'}
                  </td>
                  <td><span className={`badge badge-${STATUS_BADGE[p.status]}`}>{p.status}</span></td>
                  <td className="text-muted">
                    {p.account_login ? `${p.account_platform} / ${p.account_login}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-cards">
          {loading && <div className="empty">Loading…</div>}
          {!loading && proxies.length === 0 && <div className="empty">No proxies assigned to you yet</div>}
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
                  <div className="mc-meta-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.host}</div>
                </div>
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Port</div>
                  <div className="mc-meta-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.port}</div>
                </div>
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Country</div>
                  <div className="mc-meta-value">{p.country || '—'}</div>
                </div>
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Account</div>
                  <div className="mc-meta-value">{p.account_login ? `${p.account_platform}/${p.account_login}` : '—'}</div>
                </div>
              </div>
              {/* Credentials block — only shown if visible_to_worker=true (server sends real values) */}
              {(p.username || p.password) && (
                <div className="mc-meta" style={{ marginTop: 6 }}>
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Username</div>
                    <div className="mc-meta-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.username}</div>
                  </div>
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Password</div>
                    <div className="mc-meta-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.password}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
