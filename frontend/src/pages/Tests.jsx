/**
 * Tests page — admin sidebar "Tests" item.
 * Shows all active test_bundle_experiments (planned, running, waiting_result, retest)
 * across all UBT Bundles. Click any row to go to the parent bundle detail.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { FlaskConical } from 'lucide-react';

const ALL_STATUSES = ['planned', 'running', 'waiting_result', 'completed', 'success', 'failed', 'retest'];
const ACTIVE_STATUSES = ['planned', 'running', 'waiting_result', 'retest'];

const STATUS_BADGE = {
  planned:        'pending',
  running:        'testing',
  waiting_result: 'warmup',
  completed:      'pending',
  success:        'active',
  failed:         'banned',
  retest:         'warmup',
};

function statusLabel(s) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function Tests() {
  const navigate = useNavigate();

  const [experiments, setExperiments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filterStatus, setFilterStatus] = useState('active'); // 'active' or exact status

  const load = useCallback(() => {
    setLoading(true);
    const qs = filterStatus === 'active'
      ? '?active=true'
      : `?status=${filterStatus}`;
    api.get(`/test-bundle-experiments${qs}`)
      .then(setExperiments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterStatus]);

  useEffect(load, [load]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <FlaskConical size={20} strokeWidth={1.75}
            style={{ color: 'var(--accent)', marginRight: 8, verticalAlign: 'middle' }} />
          Tests
        </h1>
        <span className="text-muted" style={{ fontSize: 13 }}>
          {loading ? '…' : `${experiments.length} experiment${experiments.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Status filter */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <select className="form-control" style={{ minWidth: 160 }}
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="active">Active (all running)</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
      </div>

      <div className="card">
        {/* Desktop table */}
        <div className="table-wrap hide-mobile">
          <table>
            <thead>
              <tr>
                <th>Experiment</th>
                <th>Bundle</th>
                <th>GEO</th>
                <th>Offer</th>
                <th>Variable Tested</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Start</th>
                <th>End</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} className="empty">Loading…</td></tr>
              )}
              {!loading && experiments.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty">
                    No {filterStatus === 'active' ? 'active' : statusLabel(filterStatus).toLowerCase()} experiments
                  </td>
                </tr>
              )}
              {experiments.map(e => (
                <tr key={e.id} style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/test-bundles/${e.test_bundle_id}`)}>
                  <td style={{ fontWeight: 600 }}>{e.name}</td>
                  <td style={{ color: 'var(--accent)', fontWeight: 500 }}>{e.bundle_name}</td>
                  <td className="text-muted">{e.bundle_geo  || '—'}</td>
                  <td className="text-muted">{e.bundle_offer || '—'}</td>
                  <td className="text-muted"
                    style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.variable_tested || '—'}
                  </td>
                  <td className="text-muted">{e.owner_name || '—'}</td>
                  <td>
                    <span className={`badge badge-${STATUS_BADGE[e.status] || 'pending'}`}>
                      {statusLabel(e.status)}
                    </span>
                  </td>
                  <td className="text-muted">
                    {e.start_date ? new Date(e.start_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="text-muted">
                    {e.end_date ? new Date(e.end_date).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-cards">
          {loading && <div className="empty">Loading…</div>}
          {!loading && experiments.length === 0 && (
            <div className="empty">No active experiments</div>
          )}
          {experiments.map(e => (
            <div className="mc-card" key={e.id}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/test-bundles/${e.test_bundle_id}`)}>
              <div className="mc-head">
                <div className="mc-head-info">
                  <div className="mc-title">{e.name}</div>
                  <div className="mc-badges">
                    <span className={`badge badge-${STATUS_BADGE[e.status] || 'pending'}`}>
                      {statusLabel(e.status)}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--accent)' }}>{e.bundle_name}</span>
                  </div>
                </div>
              </div>
              <div className="mc-meta">
                {e.bundle_geo && (
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">GEO</div>
                    <div className="mc-meta-value">{e.bundle_geo}</div>
                  </div>
                )}
                {e.variable_tested && (
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Variable</div>
                    <div className="mc-meta-value">{e.variable_tested}</div>
                  </div>
                )}
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Owner</div>
                  <div className="mc-meta-value">{e.owner_name || '—'}</div>
                </div>
                {e.start_date && (
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Start</div>
                    <div className="mc-meta-value">{new Date(e.start_date).toLocaleDateString()}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
