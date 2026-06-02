import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Upload, CheckSquare, FlaskConical } from 'lucide-react';

const SOURCE_TASK = 'task';
const SOURCE_EXP  = 'experiment';

export default function ResultUploadNew() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [ctx, setCtx]     = useState(null);
  const [source, setSource] = useState(params.get('source') || SOURCE_TASK);
  const [form, setForm]   = useState({
    task_id:       params.get('task_id') || '',
    experiment_id: params.get('experiment_id') || '',
    account_id:    '',
    video_url:     '',
    views:         '',
    likes:         '',
    comments:      '',
    shares:        '',
    watch_time:    '',
    notes:         '',
    screenshot_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    api.get('/result-uploads/context').then(setCtx).catch(e => setError(e.message));
  }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  // Auto-fill account when experiment is selected
  useEffect(() => {
    if (source !== SOURCE_EXP || !form.experiment_id || !ctx) return;
    const exp = ctx.experiments.find(e => e.id === form.experiment_id);
    if (exp?.account_id) set('account_id', exp.account_id);
  }, [form.experiment_id, source]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.video_url.trim()) { setError('Video URL is required'); return; }
    if (source === SOURCE_TASK && !form.task_id)
      { setError('Select a task'); return; }
    if (source === SOURCE_EXP && !form.experiment_id)
      { setError('Select an experiment'); return; }

    setSaving(true);
    try {
      const body = {
        video_url:     form.video_url.trim(),
        account_id:    form.account_id    || undefined,
        views:         parseInt(form.views)     || 0,
        likes:         parseInt(form.likes)     || 0,
        comments:      parseInt(form.comments)  || 0,
        shares:        parseInt(form.shares)    || 0,
        watch_time:    parseInt(form.watch_time)|| 0,
        notes:         form.notes.trim()        || undefined,
        screenshot_url: form.screenshot_url.trim() || undefined,
      };
      if (source === SOURCE_TASK) body.task_id = form.task_id;
      else                        body.experiment_id = form.experiment_id;

      await api.post('/result-uploads', body);
      navigate('/result-uploads');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!ctx) return <div className="text-muted" style={{ padding: 40 }}>Loading…</div>;

  const hasTasks = ctx.tasks.length > 0;
  const hasExps  = ctx.experiments.length > 0;

  if (!hasTasks && !hasExps) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Upload Result</h1>
        </div>
        <div className="card">
          <div className="empty">
            <div className="empty-icon">📋</div>
            <div className="empty-title">Nothing to upload for yet</div>
            <div className="empty-desc">You need an open task or active experiment assigned to you before uploading a result.</div>
          </div>
        </div>
      </div>
    );
  }

  const selectedTask = source === SOURCE_TASK
    ? ctx.tasks.find(t => t.id === form.task_id)
    : null;
  const selectedExp = source === SOURCE_EXP
    ? ctx.experiments.find(e => e.id === form.experiment_id)
    : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Upload Result</h1>
          <div className="page-subtitle">Submit a video result for admin review</div>
        </div>
      </div>

      <div style={{ maxWidth: 620 }}>
        <form onSubmit={submit}>

          {/* ── Source selector ─────────────────────────────────────────── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 14, fontWeight: 700, fontSize: 14 }}>Upload for…</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {hasTasks && (
                <button
                  type="button"
                  className={`btn ${source === SOURCE_TASK ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, gap: 6 }}
                  onClick={() => setSource(SOURCE_TASK)}
                >
                  <CheckSquare size={14} strokeWidth={1.75} /> Task
                </button>
              )}
              {hasExps && (
                <button
                  type="button"
                  className={`btn ${source === SOURCE_EXP ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, gap: 6 }}
                  onClick={() => setSource(SOURCE_EXP)}
                >
                  <FlaskConical size={14} strokeWidth={1.75} /> Experiment
                </button>
              )}
            </div>

            {source === SOURCE_TASK && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Task</label>
                <select className="form-control" value={form.task_id}
                  onChange={e => set('task_id', e.target.value)} required>
                  <option value="">— Select task —</option>
                  {ctx.tasks.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.bundle_name} ({t.offer_name}) — {t.videos_required} videos
                    </option>
                  ))}
                </select>
                {selectedTask && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className="badge badge-pending">{selectedTask.status}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Bundle: {selectedTask.bundle_name}
                    </span>
                  </div>
                )}
              </div>
            )}

            {source === SOURCE_EXP && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Experiment</label>
                <select className="form-control" value={form.experiment_id}
                  onChange={e => set('experiment_id', e.target.value)} required>
                  <option value="">— Select experiment —</option>
                  {ctx.experiments.map(ex => (
                    <option key={ex.id} value={ex.id}>
                      {ex.hypothesis_title}{ex.bundle_name ? ` — ${ex.bundle_name}` : ''}
                    </option>
                  ))}
                </select>
                {selectedExp && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="badge badge-testing">active</span>
                    {selectedExp.bundle_name && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Bundle: {selectedExp.bundle_name}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Account ─────────────────────────────────────────────────── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 14, fontWeight: 700, fontSize: 14 }}>Account Used</div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Account</label>
              <select className="form-control" value={form.account_id}
                onChange={e => set('account_id', e.target.value)}>
                <option value="">— Select account (optional) —</option>
                {ctx.accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.platform} / {a.login}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Video URL ────────────────────────────────────────────────── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 14, fontWeight: 700, fontSize: 14 }}>Video</div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Video URL *</label>
              <input className="form-control" type="url"
                value={form.video_url} onChange={e => set('video_url', e.target.value)}
                placeholder="https://www.tiktok.com/@…" required />
            </div>
          </div>

          {/* ── Metrics ─────────────────────────────────────────────────── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 14, fontWeight: 700, fontSize: 14 }}>Metrics</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Views *</label>
                <input className="form-control" type="number" min="0"
                  value={form.views} onChange={e => set('views', e.target.value)}
                  placeholder="0" required />
              </div>
              <div className="form-group">
                <label className="form-label">Likes</label>
                <input className="form-control" type="number" min="0"
                  value={form.likes} onChange={e => set('likes', e.target.value)}
                  placeholder="0" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Comments</label>
                <input className="form-control" type="number" min="0"
                  value={form.comments} onChange={e => set('comments', e.target.value)}
                  placeholder="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Shares</label>
                <input className="form-control" type="number" min="0"
                  value={form.shares} onChange={e => set('shares', e.target.value)}
                  placeholder="0" />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Watch Time (seconds, optional)</label>
              <input className="form-control" type="number" min="0"
                value={form.watch_time} onChange={e => set('watch_time', e.target.value)}
                placeholder="e.g. 15" />
            </div>
          </div>

          {/* ── Extra ────────────────────────────────────────────────────── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 14, fontWeight: 700, fontSize: 14 }}>Additional Info</div>
            <div className="form-group">
              <label className="form-label">Screenshot URL (optional)</label>
              <input className="form-control" type="url"
                value={form.screenshot_url} onChange={e => set('screenshot_url', e.target.value)}
                placeholder="https://…" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Notes (optional)</label>
              <textarea className="form-control" rows={3}
                value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="Anything the admin should know…" />
            </div>
          </div>

          {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-secondary"
              onClick={() => navigate('/result-uploads')} style={{ flex: 1 }}>
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
