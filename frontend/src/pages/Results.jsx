/**
 * Results page — admin sidebar "Results" item.
 * Shows experiment_results submitted by workers for test_bundle_experiments.
 * Old result_uploads remain accessible at /result-uploads (backward compat).
 */
import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import { Upload, CheckCircle2, XCircle, Eye } from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────
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

// ── Review modal ──────────────────────────────────────────────────────────────
function ReviewModal({ result, onAction, onClose }) {
  const [feedback, setFeedback] = useState('');
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState('');

  async function act(action) {
    setBusy(true); setError('');
    try {
      await onAction(result.id, action, feedback);
      onClose();
    } catch (e) { setError(e.message); setBusy(false); }
  }

  const isPending = result.status === 'submitted';

  return (
    <Modal title="Review Result" onClose={onClose}
      footer={isPending ? (
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={() => act('reject')} disabled={busy}>
            <XCircle size={13} strokeWidth={2} /> Reject
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => act('approve')} disabled={busy}>
            <CheckCircle2 size={13} strokeWidth={2} /> Approve
          </button>
        </>
      ) : (
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
      )}>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', marginBottom: 16 }}>
        {[
          { label: 'Worker',     value: result.worker_name },
          { label: 'Bundle',     value: result.bundle_name    || '—' },
          { label: 'Experiment', value: result.experiment_name || '—' },
          { label: 'Status',     value: (
            <span className={`badge badge-${STATUS_BADGE[result.status]}`}>{result.status}</span>
          )},
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
                          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 14, color: 'var(--text-soft)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Views',  value: fmt(result.views) },
          { label: 'Likes',  value: fmt(result.likes) },
          { label: 'Regs',   value: fmt(result.registrations) },
          { label: 'Leads',  value: fmt(result.leads) },
          { label: 'Deps',   value: fmt(result.deposits) },
        ].map(m => (
          <div key={m.label} className="stat-card" style={{ padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{m.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
                          textTransform: 'uppercase', letterSpacing: '0.4px' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Notes */}
      {result.notes && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Notes</div>
          <div style={{ fontSize: 13, color: 'var(--text-soft)', whiteSpace: 'pre-wrap' }}>{result.notes}</div>
        </div>
      )}

      {/* Existing feedback (if reviewed) */}
      {result.admin_feedback && (
        <div style={{ marginBottom: 14, padding: '10px 12px', background: 'var(--surface-2)',
                      borderRadius: 'var(--radius)', borderLeft: '3px solid var(--danger)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Admin Feedback</div>
          <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>{result.admin_feedback}</div>
        </div>
      )}

      {/* Feedback input (only when pending) */}
      {isPending && (
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Feedback (optional, shown to worker on reject)</label>
          <textarea className="form-control" rows={2} value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Reason for rejection or improvement notes…" />
        </div>
      )}

      {error && <div className="error-msg" style={{ marginTop: 10 }}>{error}</div>}
    </Modal>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Results() {
  const [results,  setResults]  = useState([]);
  const [workers,  setWorkers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [reviewing, setReviewing] = useState(null); // result object

  // Filters
  const [fWorker,  setFWorker]  = useState('');
  const [fBundle,  setFBundle]  = useState('');
  const [fExp,     setFExp]     = useState('');
  const [fStatus,  setFStatus]  = useState('');
  const [fFrom,    setFFrom]    = useState('');
  const [fTo,      setFTo]      = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (fWorker) p.set('worker_id',                   fWorker);
    if (fBundle) p.set('test_bundle_id',              fBundle);
    if (fExp)    p.set('test_bundle_experiment_id',   fExp);
    if (fStatus) p.set('status',                      fStatus);
    if (fFrom)   p.set('date_from',                   fFrom);
    if (fTo)     p.set('date_to',                     fTo);
    const q = p.toString() ? `?${p}` : '';
    api.get(`/experiment-results${q}`)
      .then(setResults)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fWorker, fBundle, fExp, fStatus, fFrom, fTo]);

  useEffect(load, [load]);
  useEffect(() => {
    api.get('/workers').then(setWorkers).catch(() => {});
  }, []);

  async function handleAction(id, action, feedback) {
    if (action === 'approve') {
      await api.post(`/experiment-results/${id}/approve`, {});
    } else {
      await api.post(`/experiment-results/${id}/reject`, { admin_feedback: feedback });
    }
    load();
  }

  function clearFilters() {
    setFWorker(''); setFBundle(''); setFExp(''); setFStatus(''); setFFrom(''); setFTo('');
  }

  const hasFilters = fWorker || fBundle || fExp || fStatus || fFrom || fTo;

  // Derived options from current data
  const bundles     = [...new Set(results.map(r => r.bundle_name).filter(Boolean))].sort();
  const experiments = [...new Set(results.map(r => r.experiment_name).filter(Boolean))].sort();

  const pending = results.filter(r => r.status === 'submitted').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Upload size={20} strokeWidth={1.75}
              style={{ color: 'var(--accent)', marginRight: 8, verticalAlign: 'middle' }} />
            Results
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {pending > 0 && (
            <span style={{
              background: 'var(--warning)', color: '#fff',
              borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700,
            }}>
              {pending} pending
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <select className="form-control" style={{ minWidth: 150 }}
          value={fWorker} onChange={e => setFWorker(e.target.value)}>
          <option value="">All workers</option>
          {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>

        <select className="form-control" style={{ minWidth: 150 }}
          value={fBundle} onChange={e => setFBundle(e.target.value)}>
          <option value="">All bundles</option>
          {bundles.map(b => <option key={b}>{b}</option>)}
        </select>

        <select className="form-control" style={{ minWidth: 160 }}
          value={fExp} onChange={e => setFExp(e.target.value)}>
          <option value="">All experiments</option>
          {experiments.map(e => <option key={e}>{e}</option>)}
        </select>

        <select className="form-control" style={{ minWidth: 130 }}
          value={fStatus} onChange={e => setFStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <input className="form-control" type="date" style={{ minWidth: 140 }}
          value={fFrom} onChange={e => setFFrom(e.target.value)}
          title="From date" />
        <input className="form-control" type="date" style={{ minWidth: 140 }}
          value={fTo} onChange={e => setFTo(e.target.value)}
          title="To date" />

        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear</button>
        )}
      </div>

      {!loading && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          {results.length} result{results.length !== 1 ? 's' : ''}
          {hasFilters ? ' (filtered)' : ''}
        </div>
      )}

      {/* Desktop table */}
      <div className="card">
        <div className="table-wrap hide-mobile">
          <table>
            <thead>
              <tr>
                <th>Worker</th>
                <th>Bundle</th>
                <th>Experiment</th>
                <th className="text-right">Views</th>
                <th className="text-right">Likes</th>
                <th className="text-right">Regs</th>
                <th className="text-right">Leads</th>
                <th className="text-right">Deps</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={11} className="empty">Loading…</td></tr>}
              {!loading && results.length === 0 && (
                <tr><td colSpan={11} className="empty">
                  {hasFilters ? 'No results match your filters' : 'No results submitted yet'}
                </td></tr>
              )}
              {results.map(r => (
                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setReviewing(r)}>
                  <td style={{ fontWeight: 500 }}>{r.worker_name}</td>
                  <td className="text-muted"
                    style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.bundle_name || '—'}
                  </td>
                  <td className="text-muted"
                    style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.experiment_name || '—'}
                  </td>
                  <td className="text-right num">{fmt(r.views)}</td>
                  <td className="text-right num">{fmt(r.likes)}</td>
                  <td className="text-right num">{fmt(r.registrations)}</td>
                  <td className="text-right num">{fmt(r.leads)}</td>
                  <td className="text-right num">{fmt(r.deposits)}</td>
                  <td>
                    <span className={`badge badge-${STATUS_BADGE[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="text-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-ghost btn-xs" style={{ gap: 4 }}
                      onClick={e => { e.stopPropagation(); setReviewing(r); }}>
                      <Eye size={11} strokeWidth={2} /> Review
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
          {!loading && results.length === 0 && (
            <div className="empty">
              {hasFilters ? 'No results match your filters' : 'No results submitted yet'}
            </div>
          )}
          {results.map(r => (
            <div className="mc-card" key={r.id} style={{ cursor: 'pointer' }}
              onClick={() => setReviewing(r)}>
              <div className="mc-head">
                <div className="mc-head-info">
                  <div className="mc-title">{r.worker_name}</div>
                  <div className="mc-badges">
                    <span className={`badge badge-${STATUS_BADGE[r.status]}`}>{r.status}</span>
                    {r.bundle_name && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.bundle_name}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mc-meta">
                {r.experiment_name && (
                  <div className="mc-meta-item mc-meta-full">
                    <div className="mc-meta-label">Experiment</div>
                    <div className="mc-meta-value">{r.experiment_name}</div>
                  </div>
                )}
              </div>
              <div className="mc-stats">
                <div className="mc-stat">
                  <div className="mc-stat-value">{fmt(r.views)}</div>
                  <div className="mc-stat-label">Views</div>
                </div>
                <div className="mc-stat">
                  <div className="mc-stat-value">{fmt(r.registrations)}</div>
                  <div className="mc-stat-label">Regs</div>
                </div>
                <div className="mc-stat">
                  <div className="mc-stat-value">{fmt(r.leads)}</div>
                  <div className="mc-stat-label">Leads</div>
                </div>
                <div className="mc-stat">
                  <div className="mc-stat-value">{fmt(r.deposits)}</div>
                  <div className="mc-stat-label">Deps</div>
                </div>
              </div>
              <div className="mc-actions">
                <button className="btn btn-secondary btn-sm"
                  onClick={() => setReviewing(r)}>
                  <Eye size={12} strokeWidth={2} /> Review
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {reviewing && (
        <ReviewModal
          result={reviewing}
          onAction={handleAction}
          onClose={() => setReviewing(null)}
        />
      )}
    </div>
  );
}
