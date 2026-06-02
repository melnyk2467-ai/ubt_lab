import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';

function fmt(n) {
  n = parseInt(n) || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n;
}

function shortUrl(url = '') {
  try { return new URL(url).hostname.replace('www.', '') + '…'; } catch { return url.slice(0, 28) + '…'; }
}

function MetricModal({ metric, videos, onSave, onClose }) {
  const [form, setForm] = useState({
    video_id: metric?.video_id || (videos[0]?.id || ''),
    views:    metric?.views    || 0,
    likes:    metric?.likes    || 0,
    comments: metric?.comments || 0,
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      if (metric) await api.put(`/metrics/${metric.id}`, form);
      else        await api.post('/metrics', form);
      onSave();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={metric ? 'Update Metrics' : 'Add Metrics'} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
               <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Video</label>
          <select className="form-control" value={form.video_id} onChange={e => set('video_id', e.target.value)} required disabled={!!metric}>
            {videos.map(v => <option key={v.id} value={v.id}>{v.url.slice(0, 60)}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Views</label>
            <input className="form-control" type="number" min="0" value={form.views} onChange={e => set('views', parseInt(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Likes</label>
            <input className="form-control" type="number" min="0" value={form.likes} onChange={e => set('likes', parseInt(e.target.value))} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Comments</label>
          <input className="form-control" type="number" min="0" value={form.comments} onChange={e => set('comments', parseInt(e.target.value))} />
        </div>
        {error && <div className="error-msg">{error}</div>}
      </form>
    </Modal>
  );
}

export default function Metrics() {
  const [metrics, setMetrics] = useState([]);
  const [videos, setVideos]   = useState([]);
  const [filterVideo, setFilterVideo] = useState('');
  const [modal, setModal] = useState(null);

  function load() {
    const q = filterVideo ? `?video_id=${filterVideo}` : '';
    api.get(`/metrics${q}`).then(setMetrics).catch(console.error);
  }

  useEffect(() => { api.get('/videos').then(setVideos); }, []);
  useEffect(load, [filterVideo]);

  async function del(id) {
    if (!confirm('Delete this metric entry?')) return;
    await api.delete(`/metrics/${id}`);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Metrics</h1>
        <button className="btn btn-primary" onClick={() => setModal('create')}>+ Add Entry</button>
      </div>

      <div className="filter-bar">
        <select className="form-control" value={filterVideo} onChange={e => setFilterVideo(e.target.value)}>
          <option value="">All Videos</option>
          {videos.map(v => <option key={v.id} value={v.id}>{v.url.slice(0, 60)}</option>)}
        </select>
      </div>

      <div className="card">
        {/* Desktop table */}
        <div className="table-wrap hide-mobile">
          <table>
            <thead>
              <tr>
                <th>Video</th><th className="text-right">Views</th><th className="text-right">Likes</th>
                <th className="text-right">Comments</th><th>Collected At</th><th></th>
              </tr>
            </thead>
            <tbody>
              {metrics.length === 0 && <tr><td colSpan={6} className="empty">No metrics yet</td></tr>}
              {metrics.map(m => (
                <tr key={m.id}>
                  <td>
                    <a href={m.video_url} target="_blank" rel="noopener noreferrer"
                       style={{ maxWidth: 240, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.video_url}
                    </a>
                  </td>
                  <td className="text-right num" style={{ color: m.views >= 50000 ? 'var(--success)' : m.views >= 10000 ? 'var(--accent)' : 'inherit' }}>{fmt(m.views)}</td>
                  <td className="text-right num">{fmt(m.likes)}</td>
                  <td className="text-right num">{fmt(m.comments)}</td>
                  <td className="text-muted">{new Date(m.collected_at).toLocaleString()}</td>
                  <td><div className="td-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setModal(m)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => del(m.id)}>Del</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-cards">
          {metrics.length === 0 && <div className="empty">No metrics yet</div>}
          {metrics.map(m => {
            const viewColor = m.views >= 50000 ? 'var(--success)' : m.views >= 10000 ? 'var(--accent)' : 'var(--text)';
            return (
              <div className="mc-card" key={m.id}>
                <div className="mc-head">
                  <div className="mc-head-info">
                    <div className="mc-title-wrap">
                      <a href={m.video_url} target="_blank" rel="noopener noreferrer">{shortUrl(m.video_url)}</a>
                    </div>
                  </div>
                </div>
                <div className="mc-stats">
                  <div className="mc-stat">
                    <div className="mc-stat-value" style={{ color: viewColor }}>{fmt(m.views)}</div>
                    <div className="mc-stat-label">Views</div>
                  </div>
                  <div className="mc-stat">
                    <div className="mc-stat-value">{fmt(m.likes)}</div>
                    <div className="mc-stat-label">Likes</div>
                  </div>
                  <div className="mc-stat">
                    <div className="mc-stat-value">{fmt(m.comments)}</div>
                    <div className="mc-stat-label">Comments</div>
                  </div>
                </div>
                <div className="mc-meta" style={{ marginBottom: 0 }}>
                  <div className="mc-meta-item mc-meta-full">
                    <div className="mc-meta-label">Collected</div>
                    <div className="mc-meta-value">{new Date(m.collected_at).toLocaleString()}</div>
                  </div>
                </div>
                <div className="mc-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => setModal(m)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => del(m.id)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modal && (
        <MetricModal
          metric={modal === 'create' ? null : modal}
          videos={videos}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
