/**
 * Results — admin review page for experiment_results.
 * Shows all metrics. Conversion metrics (registrations, leads, deposits) are
 * editable by admin only and never visible to workers in their submit form.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import { Upload, CheckCircle2, XCircle, Eye, Lock } from 'lucide-react';

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

function MetricCell({ label, value, accent }) {
  return (
    <div style={{
      textAlign: 'center', padding: '10px 8px',
      background: 'var(--surface-2)', borderRadius: 'var(--radius)',
    }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: accent || 'var(--text)' }}>{fmt(value)}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ── Review modal ──────────────────────────────────────────────────────────────
function ReviewModal({ result: initialResult, onAction, onClose, onMetricsUpdate }) {
  const [result,   setResult]   = useState(initialResult);
  const [feedback, setFeedback] = useState(initialResult.admin_feedback || '');
  const [conv, setConv] = useState({
    registrations: initialResult.registrations ?? 0,
    leads:         initialResult.leads         ?? 0,
    deposits:      initialResult.deposits      ?? 0,
  });
  const [busy,      setBusy]      = useState(false);
  const [convSaving, setConvSaving] = useState(false);
  const [convSaved,  setConvSaved]  = useState(false);
  const [error,     setError]     = useState('');

  const isPending = result.status === 'submitted';

  async function act(action) {
    setBusy(true); setError('');
    try {
      await onAction(result.id, action, feedback);
      onClose();
    } catch (e) { setError(e.message); setBusy(false); }
  }

  async function saveConvMetrics() {
    setConvSaving(true); setConvSaved(false); setError('');
    try {
      const updated = await api.put(`/experiment-results/${result.id}`, {
        registrations: parseInt(conv.registrations) || 0,
        leads:         parseInt(conv.leads)         || 0,
        deposits:      parseInt(conv.deposits)      || 0,
      });
      setResult(r => ({ ...r, ...updated }));
      setConvSaved(true);
      setTimeout(() => setConvSaved(false), 2000);
      if (onMetricsUpdate) onMetricsUpdate();
    } catch (e) { setError(e.message); }
    finally { setConvSaving(false); }
  }

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

      {/* Header info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', marginBottom: 16 }}>
        {[
          { label: 'Worker',     value: result.worker_name },
          { label: 'Bundle',     value: result.bundle_name     || '—' },
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

      {/* ── Platform Metrics (worker-submitted) ── */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
        Platform Metrics
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 14 }}>
        <MetricCell label="Views"    value={result.views} />
        <MetricCell label="Likes"    value={result.likes} />
        <MetricCell label="Comments" value={result.comments} />
        <MetricCell label="Shares"   value={result.shares} />
        <MetricCell label="Saves"    value={result.saves} />
      </div>

      {/* Account / Video Status */}
      {(result.account_status || result.video_status) && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
          {result.account_status && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
                            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Account Status</div>
              <span className="badge badge-pending" style={{ textTransform: 'capitalize' }}>
                {result.account_status}
              </span>
            </div>
          )}
          {result.video_status && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
                            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Video Status</div>
              <span className="badge badge-pending" style={{ textTransform: 'capitalize' }}>
                {result.video_status}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Screenshot */}
      {result.screenshot_url && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Screenshot</div>
          <a href={result.screenshot_url} target="_blank" rel="noreferrer"
            style={{ fontSize: 13, color: 'var(--accent)', wordBreak: 'break-all' }}>
            {result.screenshot_url}
          </a>
        </div>
      )}

      {/* Notes */}
      {result.notes && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Notes from Worker</div>
          <div style={{ fontSize: 13, color: 'var(--text-soft)', whiteSpace: 'pre-wrap',
                        padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 'var(--radius)' }}>
            {result.notes}
          </div>
        </div>
      )}

      {/* ── Conversion Metrics — Admin Only ── */}
      <div style={{
        borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4, marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Lock size={12} strokeWidth={2} style={{ color: 'var(--warning)' }} />
          <span style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 700,
                         textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Conversion Metrics — Admin Only
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          These metrics are never shown to workers. Fill them in from your tracking dashboard.
        </div>
        <div className="form-row" style={{ marginBottom: 10 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Registrations</label>
            <input className="form-control" type="number" min="0"
              value={conv.registrations}
              onChange={e => setConv(c => ({ ...c, registrations: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Leads</label>
            <input className="form-control" type="number" min="0"
              value={conv.leads}
              onChange={e => setConv(c => ({ ...c, leads: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Deposits</label>
            <input className="form-control" type="number" min="0"
              value={conv.deposits}
              onChange={e => setConv(c => ({ ...c, deposits: e.target.value }))} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={saveConvMetrics} disabled={convSaving}>
            {convSaving ? 'Saving…' : 'Save Conversion Metrics'}
          </button>
          {convSaved && (
            <span style={{ fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={12} strokeWidth={2} /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Existing admin feedback (if reviewed) */}
      {result.admin_feedback && !isPending && (
        <div style={{ marginBottom: 14, padding: '10px 12px', background: 'var(--surface-2)',
                      borderRadius: 'var(--radius)', borderLeft: '3px solid var(--danger)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Admin Feedback</div>
          <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>{result.admin_feedback}</div>
        </div>
      )}

      {/* Feedback input for reject */}
      {isPending && (
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Feedback (optional — shown to worker on reject)</label>
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
  const [results,   setResults]   = useState([]);
  const [workers,   setWorkers]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [reviewing, setReviewing] = useState(null);

  const [fWorker,  setFWorker]  = useState('');
  const [fBundle,  setFBundle]  = useState('');
  const [fExp,     setFExp]     = useState('');
  const [fStatus,  setFStatus]  = useState('');
  const [fFrom,    setFFrom]    = useState('');
  const [fTo,      setFTo]      = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (fWorker) p.set('worker_id',                  fWorker);
    if (fBundle) p.set('test_bundle_id',             fBundle);
    if (fExp)    p.set('test_bundle_experiment_id',  fExp);
    if (fStatus) p.set('status',                     fStatus);
    if (fFrom)   p.set('date_from',                  fFrom);
    if (fTo)     p.set('date_to',                    fTo);
    api.get(`/experiment-results${p.toString() ? '?' + p : ''}`)
      .then(setResults)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fWorker, fBundle, fExp, fStatus, fFrom, fTo]);

  useEffect(load, [load]);
  useEffect(() => { api.get('/workers').then(setWorkers).catch(() => {}); }, []);

  async function handleAction(id, action, feedback) {
    if (action === 'approve') await api.post(`/experiment-results/${id}/approve`, {});
    else await api.post(`/experiment-results/${id}/reject`, { admin_feedback: feedback });
    load();
  }

  function clearFilters() {
    setFWorker(''); setFBundle(''); setFExp(''); setFStatus(''); setFFrom(''); setFTo('');
  }

  const hasFilters = fWorker || fBundle || fExp || fStatus || fFrom || fTo;
  const pending    = results.filter(r => r.status === 'submitted').length;

  const bundles     = [...new Set(results.map(r => r.bundle_name).filter(Boolean))].sort();
  const experiments = [...new Set(results.map(r => r.experiment_name).filter(Boolean))].sort();

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
        {pending > 0 && (
          <span style={{ background: 'var(--warning)', color: '#fff',
                         borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
            {pending} pending review
          </span>
        )}
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
          value={fFrom} onChange={e => setFFrom(e.target.value)} title="From date" />
        <input className="form-control" type="date" style={{ minWidth: 140 }}
          value={fTo} onChange={e => setFTo(e.target.value)} title="To date" />
        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear</button>
        )}
      </div>

      {!loading && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          {results.length} result{results.length !== 1 ? 's' : ''}{hasFilters ? ' (filtered)' : ''}
        </div>
      )}

      <div className="card">
        {/* Desktop table */}
        <div className="table-wrap hide-mobile">
          <table>
            <thead>
              <tr>
                <th>Worker</th>
                <th>Bundle</th>
                <th>Experiment</th>
                <th className="text-right">Views</th>
                <th className="text-right">Likes</th>
                <th className="text-right">Shares</th>
                <th className="text-right" style={{ color: 'var(--warning)' }} title="Admin-only">Regs</th>
                <th className="text-right" style={{ color: 'var(--warning)' }} title="Admin-only">Leads</th>
                <th className="text-right" style={{ color: 'var(--warning)' }} title="Admin-only">Deps</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={12} className="empty">Loading…</td></tr>}
              {!loading && results.length === 0 && (
                <tr><td colSpan={12} className="empty">
                  {hasFilters ? 'No results match your filters' : 'No results submitted yet'}
                </td></tr>
              )}
              {results.map(r => (
                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setReviewing(r)}>
                  <td style={{ fontWeight: 500 }}>{r.worker_name}</td>
                  <td className="text-muted" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.bundle_name || '—'}
                  </td>
                  <td className="text-muted" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.experiment_name || '—'}
                  </td>
                  <td className="text-right num">{fmt(r.views)}</td>
                  <td className="text-right num">{fmt(r.likes)}</td>
                  <td className="text-right num">{fmt(r.shares)}</td>
                  <td className="text-right num" style={{ color: 'var(--warning)' }}>
                    {fmt(r.registrations)}
                  </td>
                  <td className="text-right num" style={{ color: 'var(--warning)' }}>
                    {fmt(r.leads)}
                  </td>
                  <td className="text-right num" style={{ color: 'var(--warning)' }}>
                    {fmt(r.deposits)}
                  </td>
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
              {r.experiment_name && (
                <div className="mc-meta" style={{ marginBottom: 8 }}>
                  <div className="mc-meta-item mc-meta-full">
                    <div className="mc-meta-label">Experiment</div>
                    <div className="mc-meta-value">{r.experiment_name}</div>
                  </div>
                </div>
              )}
              <div className="mc-stats">
                <div className="mc-stat">
                  <div className="mc-stat-value">{fmt(r.views)}</div>
                  <div className="mc-stat-label">Views</div>
                </div>
                <div className="mc-stat">
                  <div className="mc-stat-value">{fmt(r.likes)}</div>
                  <div className="mc-stat-label">Likes</div>
                </div>
                <div className="mc-stat" style={{ color: 'var(--warning)' }}>
                  <div className="mc-stat-value">{fmt(r.registrations)}</div>
                  <div className="mc-stat-label">Regs</div>
                </div>
                <div className="mc-stat" style={{ color: 'var(--warning)' }}>
                  <div className="mc-stat-value">{fmt(r.deposits)}</div>
                  <div className="mc-stat-label">Deps</div>
                </div>
              </div>
              <div className="mc-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setReviewing(r)}>
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
          onMetricsUpdate={load}
          onClose={() => setReviewing(null)}
        />
      )}
    </div>
  );
}
