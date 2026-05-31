import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

function fmt(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n;
}

const STATUS_COLOR = { testing: 'warmup', working: 'active', dead: 'banned' };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard')
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="error-msg">{error}</div>;
  if (!data) return <div className="text-muted">Loading…</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      <div className="card-grid">
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card">
          <div className="section-title">Top Bundles by Avg Views</div>
          {data.top_bundles.length === 0 ? (
            <div className="empty">No data yet</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Bundle</th>
                  <th>Status</th>
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
            </table>
          )}
        </div>

        <div className="card">
          <div className="section-title">Top Workers by Video Count</div>
          {data.top_workers.length === 0 ? (
            <div className="empty">No data yet</div>
          ) : (
            <table>
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
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
