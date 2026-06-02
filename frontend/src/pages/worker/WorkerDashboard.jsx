import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/client';
import { Upload } from 'lucide-react';

function fmt(n) {
  n = parseInt(n) || 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

const TASK_STATUS_BADGE   = { pending: 'pending', in_progress: 'testing', done: 'active' };
const TASK_STATUS_LABEL   = { pending: 'Pending',  in_progress: 'In Progress', done: 'Done' };

export default function WorkerDashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [data,    setData]    = useState(null);
  const [error,   setError]   = useState('');
  const [marking, setMarking] = useState(null); // task id being updated

  function load() {
    api.get('/workspace').then(setData).catch(e => setError(e.message));
  }

  useEffect(load, []);

  async function markDone(taskId) {
    setMarking(taskId);
    try {
      await api.put(`/tasks/${taskId}`, { status: 'done' });
      load();
    } catch (e) { setError(e.message); }
    finally { setMarking(null); }
  }

  if (error) return <div className="error-msg">{error}</div>;
  if (!data)  return <div className="text-muted" style={{ padding: 40 }}>Loading…</div>;

  const { stats: s, accounts, open_tasks, active_experiments, recent_videos } = data;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Workspace</h1>
          <div className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>
            Welcome back, {user?.name}
          </div>
        </div>
        <button className="btn btn-primary" style={{ gap: 6 }}
          onClick={() => navigate('/result-uploads/new')}>
          <Upload size={14} strokeWidth={2} />
          Upload Result
        </button>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div className="card-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-label">Assigned Accounts</div>
          <div className="stat-value">{s.accounts_count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Open Tasks</div>
          <div className="stat-value" style={{ color: s.open_tasks_count > 0 ? 'var(--warning)' : 'inherit' }}>
            {s.open_tasks_count}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Experiments</div>
          <div className="stat-value accent">{s.active_experiments_count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Videos Uploaded</div>
          <div className="stat-value">{s.total_videos}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Views</div>
          <div className="stat-value success">{fmt(s.total_views)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Best Video</div>
          <div className="stat-value accent">{fmt(s.best_video_views)}</div>
        </div>
      </div>

      {/* ── Main panels ─────────────────────────────────────────────── */}
      <div className="panel-grid" style={{ marginBottom: 24 }}>

        {/* Open Tasks */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="section-title" style={{ margin: 0 }}>Open Tasks</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>View all →</button>
          </div>
          {open_tasks.length === 0 ? (
            <div className="empty" style={{ padding: '24px 0' }}>No open tasks 🎉</div>
          ) : (
            <div className="table-wrap"><table>
              <thead>
                <tr><th>Bundle</th><th className="text-right">Videos</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {open_tasks.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.bundle_name || '—'}</td>
                    <td className="text-right num">{t.videos_required}</td>
                    <td>
                      <span className={`badge badge-${TASK_STATUS_BADGE[t.status]}`}>
                        {TASK_STATUS_LABEL[t.status]}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--success)', borderColor: 'var(--success)', whiteSpace: 'nowrap' }}
                        onClick={() => markDone(t.id)}
                        disabled={marking === t.id}
                      >
                        {marking === t.id ? '…' : '✓ Done'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>

        {/* My Accounts */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="section-title" style={{ margin: 0 }}>My Accounts</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/accounts')}>View all →</button>
          </div>
          {accounts.length === 0 ? (
            <div className="empty" style={{ padding: '24px 0' }}>No accounts assigned yet</div>
          ) : (
            <div className="table-wrap"><table>
              <thead>
                <tr><th>Platform</th><th>Login</th><th>Status</th></tr>
              </thead>
              <tbody>
                {accounts.slice(0, 6).map(a => (
                  <tr key={a.id}>
                    <td style={{ textTransform: 'capitalize' }}>{a.platform}</td>
                    <td style={{ fontWeight: 500 }}>{a.login}</td>
                    <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>

      <div className="panel-grid">

        {/* Active Experiments */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="section-title" style={{ margin: 0 }}>Active Experiments</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/research/experiments')}>View all →</button>
          </div>
          {active_experiments.length === 0 ? (
            <div className="empty" style={{ padding: '24px 0' }}>No active experiments</div>
          ) : (
            <div className="table-wrap"><table>
              <thead>
                <tr><th>Hypothesis</th><th>Bundle</th><th>End</th></tr>
              </thead>
              <tbody>
                {active_experiments.slice(0, 5).map(e => (
                  <tr key={e.id}>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                      {e.hypothesis_title}
                    </td>
                    <td className="text-muted">{e.bundle_name || '—'}</td>
                    <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                      {e.end_date ? new Date(e.end_date).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>

        {/* Recent Videos */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="section-title" style={{ margin: 0 }}>Recent Videos</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/videos')}>View all →</button>
          </div>
          {recent_videos.length === 0 ? (
            <div className="empty" style={{ padding: '24px 0' }}>
              No videos yet —{' '}
              <button
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 14 }}
                onClick={() => navigate('/videos')}
              >
                add your first video
              </button>
            </div>
          ) : (
            <div className="table-wrap"><table>
              <thead>
                <tr><th>Video</th><th>Bundle</th><th className="text-right">Views</th></tr>
              </thead>
              <tbody>
                {recent_videos.slice(0, 6).map(v => (
                  <tr key={v.id}>
                    <td>
                      <a href={v.url} target="_blank" rel="noopener noreferrer"
                        style={{ maxWidth: 140, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.url}
                      </a>
                    </td>
                    <td className="text-muted">{v.bundle_name}</td>
                    <td className="text-right num"
                      style={{ color: v.latest_views >= 50000 ? 'var(--success)' : v.latest_views >= 10000 ? 'var(--accent)' : 'inherit' }}>
                      {fmt(v.latest_views)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>
    </div>
  );
}
