import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

function fmt(n) {
  n = parseInt(n) || 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n;
}

function MiniStat({ label, value, color }) {
  return (
    <div className="stat-card" style={{ padding: '16px 18px' }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: 26, color: color || 'inherit' }}>{value}</div>
    </div>
  );
}

function shortUrl(url = '') {
  try { return new URL(url).hostname.replace('www.', '') + '…'; } catch { return url.slice(0, 28) + '…'; }
}

const TASK_STATUS_BADGE = { pending: 'pending', in_progress: 'testing', done: 'active' };

export default function WorkerProfile() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [data, setData]       = useState(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/workers/${id}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-muted" style={{ padding: 40 }}>Loading…</div>;
  if (error)   return <div className="error-msg" style={{ margin: 24 }}>{error}</div>;
  if (!data)   return null;

  const { worker, accounts, tasks, experiments, videos, metrics_summary: ms } = data;
  const initials = worker.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }} onClick={() => navigate('/workers')}>
        ← Back to Workers
      </button>

      {/* Header card */}
      <div className="card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, flexShrink: 0, boxShadow: '0 4px 14px var(--accent-glow)' }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px', marginBottom: 6 }}>{worker.name}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="text-muted" style={{ fontSize: 13 }}>{worker.email}</span>
            <span className={`badge badge-${worker.role}`}>{worker.role}</span>
            <span className={`badge badge-${worker.is_active ? 'active' : 'banned'}`}>{worker.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
        <div className="text-muted" style={{ fontSize: 12 }}>Joined {new Date(worker.created_at).toLocaleDateString()}</div>
      </div>

      {/* Summary stats */}
      <div className="card-grid" style={{ marginBottom: 28 }}>
        <MiniStat label="Assigned Accounts" value={accounts.length} />
        <MiniStat label="Total Tasks"        value={tasks.length} />
        <MiniStat label="Experiments"        value={experiments.length} color="var(--accent)" />
        <MiniStat label="Videos Uploaded"    value={ms.total_videos} />
        <MiniStat label="Total Views"        value={fmt(ms.total_views)} color="var(--success)" />
        <MiniStat label="Best Video"         value={fmt(ms.best_video_views)} color="var(--accent)" />
      </div>

      {/* Assigned Accounts */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">Assigned Accounts ({accounts.length})</div>
        {accounts.length === 0 ? <div className="empty">No accounts assigned</div> : (
          <>
            <div className="table-wrap hide-mobile">
              <table>
                <thead><tr><th>Platform</th><th>Login</th><th>Status</th><th>Created</th></tr></thead>
                <tbody>
                  {accounts.map(a => (
                    <tr key={a.id}>
                      <td style={{ textTransform: 'capitalize' }}>{a.platform}</td>
                      <td>{a.login}</td>
                      <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                      <td className="text-muted">{new Date(a.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-cards">
              {accounts.map(a => (
                <div className="mc-card" key={a.id}>
                  <div className="mc-head">
                    <div className="mc-head-info">
                      <div className="mc-title">{a.login}</div>
                      <div className="mc-badges">
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{a.platform}</span>
                        <span className={`badge badge-${a.status}`}>{a.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mc-meta" style={{ marginBottom: 0 }}>
                    <div className="mc-meta-item">
                      <div className="mc-meta-label">Created</div>
                      <div className="mc-meta-value">{new Date(a.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Tasks */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">Tasks ({tasks.length})</div>
        {tasks.length === 0 ? <div className="empty">No tasks assigned</div> : (
          <>
            <div className="table-wrap hide-mobile">
              <table>
                <thead><tr><th>Bundle</th><th>Videos Required</th><th>Status</th><th>Created</th></tr></thead>
                <tbody>
                  {tasks.map(t => (
                    <tr key={t.id}>
                      <td>{t.bundle_name || '—'}</td>
                      <td className="num">{t.videos_required}</td>
                      <td><span className={`badge badge-${TASK_STATUS_BADGE[t.status] || t.status}`}>{t.status}</span></td>
                      <td className="text-muted">{new Date(t.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-cards">
              {tasks.map(t => (
                <div className="mc-card" key={t.id}>
                  <div className="mc-head">
                    <div className="mc-head-info">
                      <div className="mc-title">{t.bundle_name || '—'}</div>
                      <div className="mc-badges">
                        <span className={`badge badge-${TASK_STATUS_BADGE[t.status] || t.status}`}>{t.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mc-meta" style={{ marginBottom: 0 }}>
                    <div className="mc-meta-item">
                      <div className="mc-meta-label">Videos Req.</div>
                      <div className="mc-meta-value">{t.videos_required}</div>
                    </div>
                    <div className="mc-meta-item">
                      <div className="mc-meta-label">Created</div>
                      <div className="mc-meta-value">{new Date(t.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Experiments */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">Experiments ({experiments.length})</div>
        {experiments.length === 0 ? <div className="empty">No experiments assigned</div> : (
          <>
            <div className="table-wrap hide-mobile">
              <table>
                <thead><tr><th>Hypothesis</th><th>Account</th><th>Bundle</th><th>Status</th><th>Start</th></tr></thead>
                <tbody>
                  {experiments.map(e => (
                    <tr key={e.id}>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.hypothesis_title}</td>
                      <td className="text-muted">{e.account_login ? `${e.account_login} (${e.platform})` : '—'}</td>
                      <td className="text-muted">{e.bundle_name || '—'}</td>
                      <td><span className={`badge badge-${e.status === 'active' ? 'testing' : 'active'}`}>{e.status}</span></td>
                      <td className="text-muted">{e.start_date ? new Date(e.start_date).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-cards">
              {experiments.map(e => (
                <div className="mc-card" key={e.id}>
                  <div className="mc-head">
                    <div className="mc-head-info">
                      <div className="mc-title" style={{ whiteSpace: 'normal', WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 14 }}>
                        {e.hypothesis_title}
                      </div>
                      <div className="mc-badges" style={{ marginTop: 4 }}>
                        <span className={`badge badge-${e.status === 'active' ? 'testing' : 'active'}`}>{e.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mc-meta" style={{ marginBottom: 0 }}>
                    <div className="mc-meta-item">
                      <div className="mc-meta-label">Bundle</div>
                      <div className="mc-meta-value">{e.bundle_name || '—'}</div>
                    </div>
                    <div className="mc-meta-item">
                      <div className="mc-meta-label">Start</div>
                      <div className="mc-meta-value">{e.start_date ? new Date(e.start_date).toLocaleDateString() : '—'}</div>
                    </div>
                    {e.account_login && (
                      <div className="mc-meta-item mc-meta-full">
                        <div className="mc-meta-label">Account</div>
                        <div className="mc-meta-value">{e.account_login} ({e.platform})</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Recent Videos */}
      <div className="card">
        <div className="section-title">Recent Videos (last 20)</div>
        {videos.length === 0 ? <div className="empty">No videos uploaded yet</div> : (
          <>
            <div className="table-wrap hide-mobile">
              <table>
                <thead>
                  <tr><th>URL</th><th>Bundle</th><th>Account</th><th className="text-right">Views</th><th className="text-right">Likes</th><th>Posted</th></tr>
                </thead>
                <tbody>
                  {videos.map(v => (
                    <tr key={v.id}>
                      <td>
                        <a href={v.url} target="_blank" rel="noopener noreferrer"
                          style={{ maxWidth: 180, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {v.url}
                        </a>
                      </td>
                      <td className="text-muted">{v.bundle_name}</td>
                      <td className="text-muted">{v.account_login} ({v.platform})</td>
                      <td className="text-right num"
                        style={{ color: v.latest_views >= 50000 ? 'var(--success)' : v.latest_views >= 10000 ? 'var(--accent)' : 'inherit' }}>
                        {fmt(v.latest_views)}
                      </td>
                      <td className="text-right num">{fmt(v.latest_likes)}</td>
                      <td className="text-muted">{v.posted_at ? new Date(v.posted_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-cards">
              {videos.map(v => {
                const views = parseInt(v.latest_views) || 0;
                const viewColor = views >= 50000 ? 'var(--success)' : views >= 10000 ? 'var(--accent)' : 'var(--text)';
                return (
                  <div className="mc-card" key={v.id}>
                    <div className="mc-head">
                      <div className="mc-head-info">
                        <div className="mc-title-wrap">
                          <a href={v.url} target="_blank" rel="noopener noreferrer">{shortUrl(v.url)}</a>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: viewColor, fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>
                          {fmt(v.latest_views)} <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>views</span>
                        </div>
                      </div>
                    </div>
                    <div className="mc-meta" style={{ marginBottom: 0 }}>
                      <div className="mc-meta-item">
                        <div className="mc-meta-label">Bundle</div>
                        <div className="mc-meta-value">{v.bundle_name}</div>
                      </div>
                      <div className="mc-meta-item">
                        <div className="mc-meta-label">Likes</div>
                        <div className="mc-meta-value num">{fmt(v.latest_likes)}</div>
                      </div>
                      <div className="mc-meta-item mc-meta-full">
                        <div className="mc-meta-label">Account</div>
                        <div className="mc-meta-value">{v.account_login} ({v.platform})</div>
                      </div>
                      <div className="mc-meta-item">
                        <div className="mc-meta-label">Posted</div>
                        <div className="mc-meta-value">{v.posted_at ? new Date(v.posted_at).toLocaleDateString() : '—'}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
