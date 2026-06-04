/**
 * ResultNew — worker submit form for experiment-based results.
 * Platform/task metrics only. Conversion metrics (registrations, leads, deposits)
 * are admin-only and never shown here.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Upload, FlaskConical } from 'lucide-react';

const ACCOUNT_STATUS_OPTIONS = ['active', 'banned', 'warming up', 'restricted', 'other'];
const VIDEO_STATUS_OPTIONS   = ['posted', 'removed', 'shadow-banned', 'viral', 'other'];

export default function ResultNew() {
  const navigate = useNavigate();

  const [experiments, setExperiments] = useState([]);
  const [ctxLoading,  setCtxLoading]  = useState(true);

  const [form, setForm] = useState({
    test_bundle_experiment_id: '',
    views:          '',
    likes:          '',
    comments:       '',
    shares:         '',
    saves:          '',
    account_status: '',
    video_status:   '',
    screenshot_url: '',
    notes:          '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    api.get('/experiment-results/context')
      .then(setExperiments)
      .catch(e => setError(e.message))
      .finally(() => setCtxLoading(false));
  }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const selectedExp = experiments.find(e => e.id === form.test_bundle_experiment_id);

  async function submit(e) {
    e.preventDefault();
    if (!form.test_bundle_experiment_id) { setError('Select an experiment'); return; }
    setError(''); setSaving(true);
    try {
      await api.post('/experiment-results', {
        test_bundle_experiment_id: form.test_bundle_experiment_id,
        views:          parseInt(form.views)    || 0,
        likes:          parseInt(form.likes)    || 0,
        comments:       parseInt(form.comments) || 0,
        shares:         parseInt(form.shares)   || 0,
        saves:          parseInt(form.saves)    || 0,
        account_status: form.account_status || undefined,
        video_status:   form.video_status   || undefined,
        screenshot_url: form.screenshot_url.trim() || undefined,
        notes:          form.notes.trim()          || undefined,
      });
      navigate('/results');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (ctxLoading) return <div className="text-muted" style={{ padding: 40 }}>Loading…</div>;

  if (!ctxLoading && experiments.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Submit Results</h1>
        </div>
        <div className="card">
          <div className="empty">
            <div className="empty-icon">🧪</div>
            <div className="empty-title">No active experiments assigned</div>
            <div className="empty-desc">
              You need an active experiment assigned to one of your bundles before submitting results.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Submit Results</h1>
          <div className="page-subtitle">Report platform metrics for your experiment</div>
        </div>
      </div>

      <div style={{ maxWidth: 580 }}>
        <form onSubmit={submit}>

          {/* ── Experiment picker ───────────────────────────────────────── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <FlaskConical size={15} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Experiment</span>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Select Experiment *</label>
              <select className="form-control"
                value={form.test_bundle_experiment_id}
                onChange={e => set('test_bundle_experiment_id', e.target.value)}
                required>
                <option value="">— Select experiment —</option>
                {experiments.map(ex => (
                  <option key={ex.id} value={ex.id}>
                    {ex.bundle_name} → {ex.experiment_name}
                    {ex.geo ? ` (${ex.geo})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {selectedExp && (
              <div style={{
                marginTop: 12, padding: '10px 12px',
                background: 'var(--surface-2)', borderRadius: 'var(--radius)',
                display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13,
              }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Bundle: </span>
                  <span>{selectedExp.bundle_name}</span></div>
                {selectedExp.geo && (
                  <div><span style={{ color: 'var(--text-muted)' }}>GEO: </span>
                    <span>{selectedExp.geo}</span></div>
                )}
                {selectedExp.offer && (
                  <div><span style={{ color: 'var(--text-muted)' }}>Offer: </span>
                    <span>{selectedExp.offer}</span></div>
                )}
                <span className={`badge badge-${
                  selectedExp.status === 'running' ? 'testing' :
                  selectedExp.status === 'planned' ? 'pending' : 'warmup'
                }`}>{selectedExp.status}</span>
              </div>
            )}
          </div>

          {/* ── Platform Metrics ────────────────────────────────────────── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Platform Metrics</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Stats visible on the platform (TikTok, Instagram, etc.)
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Views</label>
                <input className="form-control" type="number" min="0"
                  value={form.views} onChange={e => set('views', e.target.value)} placeholder="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Likes</label>
                <input className="form-control" type="number" min="0"
                  value={form.likes} onChange={e => set('likes', e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Comments</label>
                <input className="form-control" type="number" min="0"
                  value={form.comments} onChange={e => set('comments', e.target.value)} placeholder="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Shares</label>
                <input className="form-control" type="number" min="0"
                  value={form.shares} onChange={e => set('shares', e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Saves / Bookmarks</label>
              <input className="form-control" type="number" min="0"
                value={form.saves} onChange={e => set('saves', e.target.value)} placeholder="0" />
            </div>
          </div>

          {/* ── Status ──────────────────────────────────────────────────── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Status</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Account Status</label>
                <select className="form-control"
                  value={form.account_status}
                  onChange={e => set('account_status', e.target.value)}>
                  <option value="">— Select —</option>
                  {ACCOUNT_STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Video Status</label>
                <select className="form-control"
                  value={form.video_status}
                  onChange={e => set('video_status', e.target.value)}>
                  <option value="">— Select —</option>
                  {VIDEO_STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── Proof & Notes ───────────────────────────────────────────── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Proof & Notes</div>
            <div className="form-group">
              <label className="form-label">Screenshot URL (optional)</label>
              <input className="form-control" type="url"
                value={form.screenshot_url}
                onChange={e => set('screenshot_url', e.target.value)}
                placeholder="https://… link to screenshot" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Notes (optional)</label>
              <textarea className="form-control" rows={3}
                value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="What happened, observations, anything the admin should know…" />
            </div>
          </div>

          {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-secondary"
              onClick={() => navigate('/results')} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary"
              disabled={saving} style={{ flex: 2, gap: 7 }}>
              <Upload size={14} strokeWidth={2} />
              {saving ? 'Submitting…' : 'Submit for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
