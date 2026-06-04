import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import {
  ArrowLeft, Pencil, Trash2, Layers,
  Globe, Tag, Monitor, Users, Shield,
  Lightbulb, CalendarDays, FileText,
  FlaskConical, Upload, Trophy, XCircle, RefreshCw,
  CheckCircle2,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUSES = ['draft', 'testing', 'winner', 'dead', 'retest'];

const STATUS_BADGE = {
  draft:   'pending',
  testing: 'testing',
  winner:  'active',
  dead:    'banned',
  retest:  'warmup',
};

const UPLOAD_STATUS_BADGE = {
  pending_review: 'testing',
  approved:       'active',
  rejected:       'banned',
};

const EXP_STATUS_BADGE = {
  active:    'testing',
  completed: 'active',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) {
  n = parseInt(n) || 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ icon: Icon, title, color, children }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
        <Icon size={16} strokeWidth={1.75} style={{ color: color || 'var(--accent)', flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.2px' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

// ── Labelled field ────────────────────────────────────────────────────────────
function Field({ label, value, mono = false, span = false }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 3,
      ...(span ? {} : {}),
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-soft)', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
        {value}
      </div>
    </div>
  );
}

function FieldGrid({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px 20px' }}>
      {children}
    </div>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────
function EditModal({ bundle, workers, onSave, onClose }) {
  const [form, setForm] = useState({
    ...bundle,
    owner_id:   bundle.owner_id   || '',
    start_date: bundle.start_date ? bundle.start_date.slice(0, 10) : '',
    end_date:   bundle.end_date   ? bundle.end_date.slice(0, 10)   : '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      await api.put(`/test-bundles/${bundle.id}`, { ...form, owner_id: form.owner_id || null });
      onSave(); onClose();
    } catch (e) { setError(e.message); setSaving(false); }
  }

  return (
    <Modal title="Edit UBT Bundle" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </>}>
      <div className="form-row">
        <div className="form-group" style={{ flex: 2 }}>
          <label className="form-label">Name *</label>
          <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Status</label>
          <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">GEO</label>
          <input className="form-control" value={form.geo || ''} onChange={e => set('geo', e.target.value)} placeholder="US, UK…" />
        </div>
        <div className="form-group">
          <label className="form-label">Offer</label>
          <input className="form-control" value={form.offer || ''} onChange={e => set('offer', e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Source / Platform</label>
          <input className="form-control" value={form.source_platform || ''} onChange={e => set('source_platform', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Account Type</label>
          <input className="form-control" value={form.account_type || ''} onChange={e => set('account_type', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Proxy Setup</label>
        <input className="form-control" value={form.proxy_setup || ''} onChange={e => set('proxy_setup', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Creative Angle</label>
        <input className="form-control" value={form.creative_angle || ''} onChange={e => set('creative_angle', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Hypothesis</label>
        <textarea className="form-control" rows={2} value={form.hypothesis || ''} onChange={e => set('hypothesis', e.target.value)} />
      </div>
      <div className="form-row">
        <div className="form-group" style={{ flex: 2 }}>
          <label className="form-label">Responsible Worker</label>
          <select className="form-control" value={form.owner_id} onChange={e => set('owner_id', e.target.value)}>
            <option value="">— Unassigned —</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Start Date</label>
          <input className="form-control" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">End Date</label>
          <input className="form-control" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-control" rows={3} value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
      </div>
      {error && <div className="error-msg">{error}</div>}
    </Modal>
  );
}

// ── Confirm delete modal ──────────────────────────────────────────────────────
function ConfirmModal({ name, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try { await onConfirm(); onClose(); } catch { setBusy(false); }
  }
  return (
    <Modal title="Delete Bundle" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" onClick={go} disabled={busy}>
          {busy ? 'Deleting…' : 'Delete'}
        </button>
      </>}>
      <p style={{ color: 'var(--text-soft)', fontSize: 14 }}>
        Delete <strong style={{ color: 'var(--text)' }}>"{name}"</strong>? This cannot be undone.
      </p>
    </Modal>
  );
}

// ── Section 3: Experiments empty state ───────────────────────────────────────
function ExpEmpty() {
  return (
    <div style={{ padding: '18px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      No experiments assigned to this worker yet
    </div>
  );
}

// ── Section 4: Results empty state ───────────────────────────────────────────
function ResultsEmpty() {
  return (
    <div style={{ padding: '18px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      No results submitted yet
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TestBundleDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';

  const [bundle,      setBundle]      = useState(null);
  const [workers,     setWorkers]     = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [uploads,     setUploads]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [modal,       setModal]       = useState(null); // 'edit' | 'confirm'

  // Final Decision local state
  const [fdStatus,  setFdStatus]  = useState('');
  const [fdNotes,   setFdNotes]   = useState('');
  const [fdSaving,  setFdSaving]  = useState(false);
  const [fdSaved,   setFdSaved]   = useState(false);

  const load = useCallback(() => {
    api.get(`/test-bundles/${id}`)
      .then(b => {
        setBundle(b);
        setFdStatus(b.status);
        setFdNotes(b.notes || '');
        setError('');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  // Fetch related data (admin only)
  useEffect(() => {
    if (!isAdmin || !bundle) return;

    // Workers list for edit modal
    api.get('/workers').then(setWorkers).catch(() => {});

    // Experiments for this bundle's assigned worker
    if (bundle.owner_id) {
      api.get('/research/experiments')
        .then(exps => setExperiments(exps.filter(e => e.assigned_worker_id === bundle.owner_id)))
        .catch(() => setExperiments([]));

      api.get(`/result-uploads?worker_id=${bundle.owner_id}`)
        .then(setUploads)
        .catch(() => setUploads([]));
    }
  }, [isAdmin, bundle?.id, bundle?.owner_id]); // eslint-disable-line

  async function saveDecision() {
    setFdSaving(true); setFdSaved(false);
    try {
      await api.put(`/test-bundles/${id}`, { status: fdStatus, notes: fdNotes });
      setBundle(b => ({ ...b, status: fdStatus, notes: fdNotes }));
      setFdSaved(true);
      setTimeout(() => setFdSaved(false), 2500);
    } catch (e) { alert(e.message); }
    finally { setFdSaving(false); }
  }

  async function deleteBundle() {
    await api.delete(`/test-bundles/${id}`);
    navigate('/test-bundles');
  }

  if (loading) return <div className="text-muted" style={{ padding: 40 }}>Loading…</div>;
  if (error)   return <div className="error-msg" style={{ margin: 24 }}>{error}</div>;
  if (!bundle) return null;

  const createdAt  = bundle.created_at ? new Date(bundle.created_at).toLocaleDateString()  : null;
  const updatedAt  = bundle.updated_at ? new Date(bundle.updated_at).toLocaleString()       : null;

  return (
    <div>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }}
        onClick={() => navigate('/test-bundles')}>
        <ArrowLeft size={14} strokeWidth={2} />
        Back to UBT Bundles
      </button>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius)', flexShrink: 0,
            background: 'var(--accent-dim)', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Layers size={22} strokeWidth={1.75} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px', marginBottom: 8 }}>
              {bundle.name}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className={`badge badge-${STATUS_BADGE[bundle.status] || 'pending'}`}>
                {bundle.status.charAt(0).toUpperCase() + bundle.status.slice(1)}
              </span>
              {bundle.geo && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Globe size={11} strokeWidth={2} /> {bundle.geo}
                </span>
              )}
              {bundle.source_platform && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Monitor size={11} strokeWidth={2} /> {bundle.source_platform}
                </span>
              )}
              {bundle.owner_name && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Users size={11} strokeWidth={2} /> {bundle.owner_name}
                </span>
              )}
              {createdAt && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Created {createdAt}</span>
              )}
            </div>
          </div>
          {isAdmin && (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button className="btn btn-secondary btn-sm" style={{ gap: 5 }}
                onClick={() => setModal('edit')}>
                <Pencil size={12} strokeWidth={2} /> Edit
              </button>
              <button className="btn btn-ghost btn-sm"
                style={{ color: 'var(--danger)', borderColor: 'var(--danger-dim)', gap: 5 }}
                onClick={() => setModal('confirm')}>
                <Trash2 size={12} strokeWidth={2} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 1: Bundle Overview ────────────────────────────────────────── */}
      <Section icon={Layers} title="Bundle Overview">
        <FieldGrid>
          <Field label="GEO"             value={bundle.geo} />
          <Field label="Offer"           value={bundle.offer} />
          <Field label="Source / Platform" value={bundle.source_platform} />
          <Field label="Account Type"    value={bundle.account_type} />
          <Field label="Proxy Setup"     value={bundle.proxy_setup} />
          <Field label="Owner"           value={bundle.owner_name} />
          {(bundle.start_date || bundle.end_date) && (
            <Field
              label="Dates"
              value={`${bundle.start_date ? new Date(bundle.start_date).toLocaleDateString() : '—'} → ${bundle.end_date ? new Date(bundle.end_date).toLocaleDateString() : 'ongoing'}`}
            />
          )}
        </FieldGrid>
        {updatedAt && (
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            Last updated: {updatedAt}
          </div>
        )}
      </Section>

      {/* ── SECTION 2: Hypothesis ─────────────────────────────────────────────── */}
      <Section icon={Lightbulb} title="Hypothesis" color="var(--warning)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Creative Angle" value={bundle.creative_angle} />
          <Field label="Hypothesis"     value={bundle.hypothesis} />
          {!bundle.creative_angle && !bundle.hypothesis && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              No hypothesis defined yet. Edit this bundle to add one.
            </div>
          )}
        </div>
      </Section>

      {/* ── SECTION 3: Experiments ────────────────────────────────────────────── */}
      <Section icon={FlaskConical} title="Experiments" color="var(--accent)">
        {experiments.length === 0 ? <ExpEmpty /> : (
          <>
            {/* Desktop */}
            <div className="table-wrap hide-mobile">
              <table>
                <thead>
                  <tr>
                    <th>Hypothesis</th>
                    <th>Bundle</th>
                    <th>Account</th>
                    <th>Status</th>
                    <th>Start</th>
                    <th>End</th>
                  </tr>
                </thead>
                <tbody>
                  {experiments.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.hypothesis_title}
                      </td>
                      <td className="text-muted">{e.bundle_name  || '—'}</td>
                      <td className="text-muted">{e.account_login ? `${e.platform}/${e.account_login}` : '—'}</td>
                      <td>
                        <span className={`badge badge-${EXP_STATUS_BADGE[e.status] || 'pending'}`}>{e.status}</span>
                      </td>
                      <td className="text-muted">{e.start_date ? new Date(e.start_date).toLocaleDateString() : '—'}</td>
                      <td className="text-muted">{e.end_date   ? new Date(e.end_date).toLocaleDateString()   : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="mobile-cards">
              {experiments.map(e => (
                <div className="mc-card" key={e.id}>
                  <div className="mc-head">
                    <div className="mc-head-info">
                      <div className="mc-title" style={{ fontSize: 13 }}>{e.hypothesis_title}</div>
                      <div className="mc-badges">
                        <span className={`badge badge-${EXP_STATUS_BADGE[e.status] || 'pending'}`}>{e.status}</span>
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
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* ── SECTION 4: Results ────────────────────────────────────────────────── */}
      <Section icon={Upload} title="Results" color="var(--success)">
        {uploads.length === 0 ? <ResultsEmpty /> : (
          <>
            {/* Desktop */}
            <div className="table-wrap hide-mobile">
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th className="text-right">Views</th>
                    <th className="text-right">Likes</th>
                    <th className="text-right">Shares</th>
                    <th>Bundle</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map(u => (
                    <tr key={u.id} style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/result-uploads/${u.id}`)}>
                      <td>
                        <span className={`badge badge-${UPLOAD_STATUS_BADGE[u.status] || 'pending'}`}>
                          {u.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="text-right num">{fmt(u.views)}</td>
                      <td className="text-right num">{fmt(u.likes)}</td>
                      <td className="text-right num">{fmt(u.shares)}</td>
                      <td className="text-muted">{u.bundle_name || '—'}</td>
                      <td className="text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="mobile-cards">
              {uploads.map(u => (
                <div className="mc-card" key={u.id} style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/result-uploads/${u.id}`)}>
                  <div className="mc-head">
                    <div className="mc-head-info">
                      <div className="mc-title">{u.bundle_name || 'Upload'}</div>
                      <div className="mc-badges">
                        <span className={`badge badge-${UPLOAD_STATUS_BADGE[u.status] || 'pending'}`}>
                          {u.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mc-stats">
                    <div className="mc-stat">
                      <div className="mc-stat-value">{fmt(u.views)}</div>
                      <div className="mc-stat-label">Views</div>
                    </div>
                    <div className="mc-stat">
                      <div className="mc-stat-value">{fmt(u.likes)}</div>
                      <div className="mc-stat-label">Likes</div>
                    </div>
                    <div className="mc-stat">
                      <div className="mc-stat-value">{fmt(u.shares)}</div>
                      <div className="mc-stat-label">Shares</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* ── SECTION 5: Final Decision ─────────────────────────────────────────── */}
      {isAdmin && (
        <Section icon={Trophy} title="Final Decision" color="var(--warning)">
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Set the final verdict for this bundle. This updates the bundle status and is visible to the assigned worker.
          </p>

          {/* Decision buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            {[
              { value: 'winner', label: 'Winner',  icon: Trophy,      color: 'var(--success)' },
              { value: 'dead',   label: 'Dead',    icon: XCircle,     color: 'var(--danger)' },
              { value: 'retest', label: 'Retest',  icon: RefreshCw,   color: 'var(--warning)' },
              { value: 'testing',label: 'Testing', icon: FlaskConical,color: 'var(--accent)' },
              { value: 'draft',  label: 'Draft',   icon: FileText,    color: 'var(--text-muted)' },
            ].map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                onClick={() => setFdStatus(value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 'var(--radius)',
                  border: `2px solid ${fdStatus === value ? color : 'var(--border)'}`,
                  background: fdStatus === value ? `${color}18` : 'transparent',
                  color: fdStatus === value ? color : 'var(--text-muted)',
                  cursor: 'pointer', fontSize: 13, fontWeight: fdStatus === value ? 700 : 500,
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={14} strokeWidth={2} />
                {label}
                {fdStatus === value && <CheckCircle2 size={13} strokeWidth={2} />}
              </button>
            ))}
          </div>

          {/* Notes */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Decision Notes</label>
            <textarea
              className="form-control"
              rows={3}
              value={fdNotes}
              onChange={e => setFdNotes(e.target.value)}
              placeholder="Why this decision? Key observations, scaling plan, or reason for archival…"
            />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={saveDecision} disabled={fdSaving}>
              {fdSaving ? 'Saving…' : 'Save Decision'}
            </button>
            {fdSaved && (
              <span style={{ fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={13} strokeWidth={2} /> Saved
              </span>
            )}
          </div>
        </Section>
      )}

      {/* Modals */}
      {modal === 'edit' && (
        <EditModal bundle={bundle} workers={workers} onSave={load} onClose={() => setModal(null)} />
      )}
      {modal === 'confirm' && (
        <ConfirmModal name={bundle.name} onConfirm={deleteBundle} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
