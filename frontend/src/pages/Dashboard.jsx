import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import WorkerDashboard from './worker/WorkerDashboard';

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n;
}

const STATUS_COLOR = { testing: 'warmup', working: 'active', dead: 'banned' };

function SectionLabel({ children }) {
  return <div className="section-label">{children}</div>;
}

function Funnel({ funnel }) {
  const stages = [
    { label: 'Ideas',       count: funnel.ideas,       color: 'var(--accent)' },
    { label: 'Patterns',    count: funnel.patterns,    color: '#7b6cff' },
    { label: 'Hypotheses',  count: funnel.hypotheses,  color: '#b060e0' },
    { label: 'Experiments', count: funnel.experiments, color: '#e06080' },
    { label: 'Winners',     count: funnel.winners,     color: 'var(--warning)' },
  ];
  const max = Math.max(...stages.map(s => s.count), 1);
  return (
    <div className="funnel">
      {stages.map((s, i) => (
        <div key={s.label} className="funnel-stage">
          <div className="funnel-stage-meta">
            <span className="funnel-stage-label">{s.label}</span>
            <span className="funnel-stage-count">{s.count}</span>
          </div>
          <div className="funnel-track">
            <div className="funnel-bar" style={{
              width: `${Math.max((s.count / max) * 100, s.count > 0 ? 3 : 0)}%`,
              background: s.color,
            }} />
          </div>
          {i < stages.length - 1 && <div className="funnel-arrow">↓</div>}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user }  = useAuth();
  // Workers get their own scoped workspace instead of the global admin dashboard
  if (user?.role === 'worker') return <WorkerDashboard />;

  const [data, setData]   = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard').then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="error-msg">{error}</div>;
  if (!data)  return <div className="text-muted">Loading…</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      {/* ── Content stats ──────────────────────────────────────────────── */}
      <SectionLabel>Content</SectionLabel>
      <div className="card-grid" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Total Videos</div>
          <div className="stat-value">{data.total_videos}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Videos &gt; 10K views</div>
          <div className="stat-value accent">{data.videos_over_10k}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Videos &gt; 50K views</div>
          <div className="stat-value success">{data.videos_over_50k}</div>
        </div>
      </div>

      {/* ── Research stats ─────────────────────────────────────────────── */}
      <SectionLabel>Research Engine</SectionLabel>
      <div className="card-grid" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Total Ideas</div>
          <div className="stat-value">{data.total_ideas}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Hypotheses</div>
          <div className="stat-value accent">{data.active_hypotheses}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Running Experiments</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{data.running_experiments}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Winners</div>
          <div className="stat-value success">{data.total_winners}</div>
        </div>
      </div>

      {/* ── Team stats ─────────────────────────────────────────────────── */}
      <SectionLabel>Team</SectionLabel>
      <div className="card-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-label">Active Workers</div>
          <div className="stat-value">{data.active_workers}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Assigned Accounts</div>
          <div className="stat-value accent">{data.assigned_accounts}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Open Tasks</div>
          <div className="stat-value" style={{ color: data.open_tasks_count > 0 ? 'var(--warning)' : 'inherit' }}>
            {data.open_tasks_count}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Experiments</div>
          <div className="stat-value success">{data.active_experiments_count}</div>
        </div>
      </div>

      {/* ── Bundle + Worker performance tables ────────────────────────── */}
      <div className="panel-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="section-title">Top Bundles by Avg Views</div>
          {data.top_bundles.length === 0 ? <div className="empty">No data yet</div> : (
            <div className="table-wrap"><table>
              <thead>
                <tr>
                  <th>Bundle</th><th>Status</th>
                  <th className="text-right">Videos</th>
                  <th className="text-right">Avg Views</th>
                  <th className="text-right">Best</th>
                </tr>
              </thead>
              <tbody>
                {data.top_bundles.map(b => (
                  <tr key={b.id}>
                    <td>{b.name}</td>
                    <td><span className={`badge badge-${STATUS_COLOR[b.status] || b.status}`}>{b.status}</span></td>
                    <td className="text-right num">{b.video_count}</td>
                    <td className="text-right num">{fmt(b.avg_views)}</td>
                    <td className="text-right num">{fmt(b.max_views)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>

        <div className="card">
          <div className="section-title">Top Workers by Video Count</div>
          {data.top_workers.length === 0 ? <div className="empty">No data yet</div> : (
            <div className="table-wrap"><table>
              <thead>
                <tr>
                  <th>Worker</th>
                  <th className="text-right">Videos</th>
                  <th className="text-right">Best Video</th>
                </tr>
              </thead>
              <tbody>
                {data.top_workers.map(w => (
                  <tr key={w.id}>
                    <td>{w.name}</td>
                    <td className="text-right num">{w.video_count}</td>
                    <td className="text-right num">{fmt(w.best_video_views)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>

      {/* ── Worker Overview ───────────────────────────────────────────── */}
      {data.worker_overview?.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="section-title" style={{ margin: 0 }}>Worker Overview</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/workers')}>
              View all →
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Worker</th>
                  <th className="text-right">Accounts</th>
                  <th className="text-right">Open Tasks</th>
                  <th className="text-right">Videos</th>
                  <th className="text-right">Active Exps</th>
                </tr>
              </thead>
              <tbody>
                {data.worker_overview.map(w => (
                  <tr key={w.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/workers/${w.id}`)}>
                    <td style={{ fontWeight: 600 }}>{w.name}</td>
                    <td className="text-right num">{w.accounts_assigned}</td>
                    <td className="text-right num">
                      <span style={{ color: w.open_tasks > 0 ? 'var(--warning)' : 'inherit' }}>
                        {w.open_tasks}
                      </span>
                    </td>
                    <td className="text-right num">{w.videos_uploaded}</td>
                    <td className="text-right num">
                      <span style={{ color: w.active_experiments > 0 ? 'var(--accent)' : 'inherit' }}>
                        {w.active_experiments}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Research Funnel ───────────────────────────────────────────── */}
      {data.funnel && (
        <div className="card">
          <div className="section-title">Research Funnel</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
            Conversion from raw idea to proven winner.
          </p>
          <Funnel funnel={data.funnel} />
        </div>
      )}
    </div>
  );
}
