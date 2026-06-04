/**
 * MyResults — worker view of their own experiment_results.
 * Read-only. Workers cannot approve/reject.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Upload, Plus } from 'lucide-react';

const STATUS_BADGE = {
  submitted: 'testing',
  approved:  'active',
  rejected:  'banned',
};

function fmt(n) {
  n = parseInt(n) || 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export default function MyResults() {
  const navigate = useNavigate();
  const [results, setResults]  = useState([]);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    api.get('/experiment-results')
      .then(setResults)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Upload size={20} strokeWidth={1.75}
              style={{ color: 'var(--accent)', marginRight: 8, verticalAlign: 'middle' }} />
            My Results
          </h1>
        </div>
        <button className="btn btn-primary btn-sm" style={{ gap: 6 }}
          onClick={() => navigate('/results/new')}>
          <Plus size={14} strokeWidth={2} /> Submit Results
        </button>
      </div>

      <div className="card">
        {/* Desktop table */}
        <div className="table-wrap hide-mobile">
          <table>
            <thead>
              <tr>
                <th>Bundle</th>
                <th>Experiment</th>
                <th className="text-right">Views</th>
                <th className="text-right">Likes</th>
                <th className="text-right">Comments</th>
                <th className="text-right">Shares</th>
                <th className="text-right">Saves</th>
                <th>Account</th>
                <th>Video</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Feedback</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10} className="empty">Loading…</td></tr>}
              {!loading && results.length === 0 && (
                <tr><td colSpan={10} className="empty">No results submitted yet — click Submit Results</td></tr>
              )}
              {results.map(r => (
                <tr key={r.id}>
                  <td className="text-muted">{r.bundle_name || '—'}</td>
                  <td style={{ fontWeight: 500 }}>{r.experiment_name || '—'}</td>
                  <td className="text-right num">{fmt(r.views)}</td>
                  <td className="text-right num">{fmt(r.likes)}</td>
                  <td className="text-right num">{fmt(r.comments)}</td>
                  <td className="text-right num">{fmt(r.shares)}</td>
                  <td className="text-right num">{fmt(r.saves)}</td>
                  <td className="text-muted">{r.account_status || '—'}</td>
                  <td className="text-muted">{r.video_status || '—'}</td>
                  <td>
                    <span className={`badge badge-${STATUS_BADGE[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="text-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="text-muted"
                    style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.admin_feedback || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-cards">
          {loading && <div className="empty">Loading…</div>}
          {!loading && results.length === 0 && (
            <div className="empty">No results submitted yet</div>
          )}
          {results.map(r => (
            <div className="mc-card" key={r.id}>
              <div className="mc-head">
                <div className="mc-head-info">
                  <div className="mc-title">{r.experiment_name || r.bundle_name || 'Result'}</div>
                  <div className="mc-badges">
                    <span className={`badge badge-${STATUS_BADGE[r.status]}`}>{r.status}</span>
                  </div>
                </div>
              </div>
              <div className="mc-stats">
                <div className="mc-stat">
                  <div className="mc-stat-value">{fmt(r.views)}</div>
                  <div className="mc-stat-label">Views</div>
                </div>
                <div className="mc-stat">
                  <div className="mc-stat-value">{fmt(r.likes)}</div>
                  <div className="mc-stat-label">Likes</div>
                </div>
                <div className="mc-stat">
                  <div className="mc-stat-value">{fmt(r.shares)}</div>
                  <div className="mc-stat-label">Shares</div>
                </div>
                <div className="mc-stat">
                  <div className="mc-stat-value">{fmt(r.saves)}</div>
                  <div className="mc-stat-label">Saves</div>
                </div>
              </div>
              {r.admin_feedback && (
                <div className="mc-meta">
                  <div className="mc-meta-item mc-meta-full">
                    <div className="mc-meta-label">Admin Feedback</div>
                    <div className="mc-meta-value">{r.admin_feedback}</div>
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
