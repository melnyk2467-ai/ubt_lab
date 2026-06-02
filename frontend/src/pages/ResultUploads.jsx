import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { Upload, Eye } from 'lucide-react';

function fmt(n) {
  n = parseInt(n) || 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

const STATUS_BADGE  = { pending_review: 'pending', approved: 'active', rejected: 'banned' };
const STATUS_LABEL  = { pending_review: 'Pending Review', approved: 'Approved', rejected: 'Rejected' };

function shortUrl(url = '') {
  try { return new URL(url).hostname.replace('www.', '') + '/…'; }
  catch { return url.slice(0, 30) + '…'; }
}

export default function ResultUploads() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const isAdmin   = user?.role === 'admin';

  const [uploads,  setUploads]  = useState([]);
  const [workers,  setWorkers]  = useState([]);
  const [bundles,  setBundles]  = useState([]);
  const [experiments, setExps]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  // filters (admin only)
  const [fWorker,  setFWorker]  = useState('');
  const [fBundle,  setFBundle]  = useState('');
  const [fExp,     setFExp]     = useState('');
  const [fStatus,  setFStatus]  = useState('');
  const [fFrom,    setFFrom]    = useState('');
  const [fTo,      setFTo]      = useState('');

  function load() {
    const p = new URLSearchParams();
    if (fWorker) p.set('worker_id',     fWorker);
    if (fBundle) p.set('bundle_id',     fBundle);
    if (fExp)    p.set('experiment_id', fExp);
    if (fStatus) p.set('status',        fStatus);
    if (fFrom)   p.set('date_from',     fFrom);
    if (fTo)     p.set('date_to',       fTo);
    const q = p.toString() ? '?' + p.toString() : '';
    setLoading(true);
    api.get(`/result-uploads${q}`)
      .then(setUploads)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (isAdmin) {
      api.get('/users').then(u => setWorkers(u.filter(x => x.role === 'worker')));
      api.get('/bundles').then(setBundles);
      api.get('/research/experiments').then(setExps);
    }
  }, [isAdmin]);

  useEffect(load, [fWorker, fBundle, fExp, fStatus, fFrom, fTo]);

  const statuses = ['pending_review', 'approved', 'rejected'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isAdmin ? 'Result Uploads' : 'My Uploads'}</h1>
          <div className="page-subtitle">
            {isAdmin ? 'Review and approve worker-submitted results' : 'Track your submitted video results'}
          </div>
        </div>
        {!isAdmin && (
          <button className="btn btn-primary" style={{ gap: 6 }}
            onClick={() => navigate('/result-uploads/new')}>
            <Upload size={14} strokeWidth={2} /> Upload Result
          </button>
        )}
      </div>

      {/* Admin filters */}
      {isAdmin && (
        <div className="filter-bar">
          <select className="form-control" value={fWorker} onChange={e => setFWorker(e.target.value)}>
            <option value="">All Workers</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select className="form-control" value={fBundle} onChange={e => setFBundle(e.target.value)}>
            <option value="">All Bundles</option>
            {bundles.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className="form-control" value={fStatus} onChange={e => setFStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <input className="form-control" type="date" value={fFrom}
            onChange={e => setFFrom(e.target.value)} title="From date" />
          <input className="form-control" type="date" value={fTo}
            onChange={e => setFTo(e.target.value)} title="To date" />
          {(fWorker || fBundle || fExp || fStatus || fFrom || fTo) && (
            <button className="btn btn-ghost"
              onClick={() => { setFWorker(''); setFBundle(''); setFExp(''); setFStatus(''); setFFrom(''); setFTo(''); }}>
              Clear
            </button>
          )}
        </div>
      )}

      {/* Pending-review badge for admins */}
      {isAdmin && !loading && uploads.filter(u => u.status === 'pending_review').length > 0 && !fStatus && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', background: 'var(--warning-dim)',
          border: '1px solid rgba(245,166,35,0.25)', borderRadius: 'var(--radius)',
          marginBottom: 20, fontSize: 13, color: 'var(--warning)',
        }}>
          <span style={{ fontWeight: 700 }}>
            {uploads.filter(u => u.status === 'pending_review').length} pending review
          </span>
          <button className="btn btn-ghost btn-xs" onClick={() => setFStatus('pending_review')}>
            Show only →
          </button>
        </div>
      )}

      <div className="card">
        {/* Desktop table */}
        <div className="table-wrap hide-mobile">
          <table>
            <thead>
              <tr>
                {isAdmin && <th>Worker</th>}
                <th>Video</th>
                <th>Bundle</th>
                {isAdmin && <th>Hypothesis</th>}
                <th className="text-right">Views</th>
                <th className="text-right">Likes</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="empty">Loading…</td></tr>}
              {!loading && uploads.length === 0 && (
                <tr><td colSpan={9} className="empty">No uploads yet</td></tr>
              )}
              {uploads.map(u => (
                <tr key={u.id} style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/result-uploads/${u.id}`)}>
                  {isAdmin && <td style={{ fontWeight: 500 }}>{u.worker_name}</td>}
                  <td>
                    <a href={u.video_url} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ maxWidth: 160, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.video_url}
                    </a>
                  </td>
                  <td className="text-muted">{u.bundle_name || '—'}</td>
                  {isAdmin && <td className="text-muted" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.hypothesis_title || '—'}</td>}
                  <td className="text-right num" style={{ color: u.views >= 50000 ? 'var(--success)' : u.views >= 10000 ? 'var(--accent)' : 'inherit' }}>
                    {fmt(u.views)}
                  </td>
                  <td className="text-right num">{fmt(u.likes)}</td>
                  <td><span className={`badge badge-${STATUS_BADGE[u.status]}`}>{STATUS_LABEL[u.status]}</span></td>
                  <td className="text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-ghost btn-xs" style={{ gap: 4 }}
                      onClick={e => { e.stopPropagation(); navigate(`/result-uploads/${u.id}`); }}>
                      <Eye size={12} strokeWidth={2} /> View
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
          {!loading && uploads.length === 0 && <div className="empty">No uploads yet</div>}
          {uploads.map(u => {
            const viewColor = u.views >= 50000 ? 'var(--success)' : u.views >= 10000 ? 'var(--accent)' : 'var(--text)';
            return (
              <div className="mc-card" key={u.id}
                onClick={() => navigate(`/result-uploads/${u.id}`)} style={{ cursor: 'pointer' }}>
                <div className="mc-head">
                  <div className="mc-head-info">
                    <div className="mc-title-wrap">
                      <a href={u.video_url} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}>
                        {shortUrl(u.video_url)}
                      </a>
                    </div>
                    <div className="mc-badges" style={{ marginTop: 5 }}>
                      <span className={`badge badge-${STATUS_BADGE[u.status]}`}>{STATUS_LABEL[u.status]}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: viewColor, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {fmt(u.views)}
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginLeft: 3 }}>views</span>
                  </div>
                </div>
                <div className="mc-meta">
                  {isAdmin && (
                    <div className="mc-meta-item">
                      <div className="mc-meta-label">Worker</div>
                      <div className="mc-meta-value">{u.worker_name}</div>
                    </div>
                  )}
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Bundle</div>
                    <div className="mc-meta-value">{u.bundle_name || '—'}</div>
                  </div>
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Likes</div>
                    <div className="mc-meta-value">{fmt(u.likes)}</div>
                  </div>
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Date</div>
                    <div className="mc-meta-value">{new Date(u.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="mc-actions">
                  <button className="btn btn-secondary btn-sm"
                    onClick={e => { e.stopPropagation(); navigate(`/result-uploads/${u.id}`); }}>
                    <Eye size={13} strokeWidth={2} /> View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
