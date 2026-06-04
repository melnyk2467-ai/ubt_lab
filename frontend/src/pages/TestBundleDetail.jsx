import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import {
  ArrowLeft, Pencil, Trash2, Layers,
  Globe, Monitor, Users, Shield,
  Lightbulb, CalendarDays, FileText, Tag,
  FlaskConical, Upload, Trophy, XCircle,
  RefreshCw, CheckCircle2, Plus,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────
const BUNDLE_STATUSES = ['draft', 'testing', 'winner', 'dead', 'retest'];

const BUNDLE_STATUS_BADGE = {
  draft:   'pending',
  testing: 'testing',
  winner:  'active',
  dead:    'banned',
  retest:  'warmup',
};

const EXP_STATUSES = ['planned', 'running', 'waiting_result', 'completed', 'success', 'failed', 'retest'];

const EXP_STATUS_BADGE = {
  planned:        'pending',
  running:        'testing',
  waiting_result: 'warmup',
  completed:      'pending',
  success:        'active',
  failed:         'banned',
  retest:         'warmup',
};

const UPLOAD_STATUS_BADGE = {
  pending_review: 'testing',
  approved:       'active',
  rejected:       'banned',
};

function statusLabel(s) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function fmt(n) {
  n = parseInt(n) || 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

// ── UI primitives ─────────────────────────────────────────────────────────────
function Section({ icon: Icon, title, color, badge, action, children }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Icon size={16} strokeWidth={1.75} style={{ color: color || 'var(--accent)', flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.2px' }}>{title}</span>
          {badge !== undefined && (
            <span style={{
              background: 'var(--accent-dim)', color: 'var(--accent)',
              borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700,
            }}>{badge}</span>
          )}
        </div>
        {action}
      </div>
      {children}
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

function Field({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--text-soft)', wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

function SectionEmpty({ label }) {
  return (
    <div style={{ padding: '20px 0', textAlign: 'center',
                  color: 'var(--text-muted)', fontSize: 13 }}>
      {label}
    </div>
  );
}

// ── Edit Bundle Modal ─────────────────────────────────────────────────────────
function EditBundleModal({ bundle, workers, onSave, onClose }) {
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
            {BUNDLE_STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
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

// ── Experiment Create/Edit Modal ──────────────────────────────────────────────
const EMPTY_EXP = {
  name: '', status: 'planned', test_goal: '', variable_tested: '',
  setup_notes: '', start_date: '', end_date: '', result_summary: '', conclusion: '',
};

function ExperimentModal({ initial, bundleId, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState(initial
    ? {
        ...initial,
        start_date: initial.start_date ? initial.start_date.slice(0, 10) : '',
        end_date:   initial.end_date   ? initial.end_date.slice(0, 10)   : '',
      }
    : { ...EMPTY_EXP }
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      if (isEdit) {
        await api.put(`/test-bundle-experiments/${initial.id}`, form);
      } else {
        await api.post('/test-bundle-experiments', { ...form, test_bundle_id: bundleId });
      }
      onSave(); onClose();
    } catch (e) { setError(e.message); setSaving(false); }
  }

  return (
    <Modal title={isEdit ? 'Edit Experiment' : 'Add Experiment'} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Add'}
        </button>
      </>}>
      {/* Row 1: name + status */}
      <div className="form-row">
        <div className="form-group" style={{ flex: 2 }}>
          <label className="form-label">Name *</label>
          <input className="form-control" value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. Hook A vs Hook B" />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Status</label>
          <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
            {EXP_STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
        </div>
      </div>

      {/* Row 2: test_goal */}
      <div className="form-group">
        <label className="form-label">Test Goal</label>
        <input className="form-control" value={form.test_goal}
          onChange={e => set('test_goal', e.target.value)}
          placeholder="What are you trying to prove or disprove?" />
      </div>

      {/* Row 3: variable_tested */}
      <div className="form-group">
        <label className="form-label">Variable Tested</label>
        <input className="form-control" value={form.variable_tested}
          onChange={e => set('variable_tested', e.target.value)}
          placeholder="e.g. Hook type, Proxy geo, Account age…" />
      </div>

      {/* Row 4: setup_notes */}
      <div className="form-group">
        <label className="form-label">Setup Notes</label>
        <textarea className="form-control" rows={2} value={form.setup_notes}
          onChange={e => set('setup_notes', e.target.value)}
          placeholder="How is this test set up? Account count, posting schedule…" />
      </div>

      {/* Row 5: dates */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Start Date</label>
          <input className="form-control" type="date" value={form.start_date}
            onChange={e => set('start_date', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">End Date</label>
          <input className="form-control" type="date" value={form.end_date}
            onChange={e => set('end_date', e.target.value)} />
        </div>
      </div>

      {/* Row 6: result_summary (show when editing or for result-phase statuses) */}
      <div className="form-group">
        <label className="form-label">Result Summary</label>
        <textarea className="form-control" rows={2} value={form.result_summary}
          onChange={e => set('result_summary', e.target.value)}
          placeholder="Key numbers, observations, what happened…" />
      </div>

      {/* Row 7: conclusion */}
      <div className="form-group">
        <label className="form-label">Conclusion</label>
        <textarea className="form-control" rows={2} value={form.conclusion}
          onChange={e => set('conclusion', e.target.value)}
          placeholder="What does this prove? Scale it, kill it, or retest?" />
      </div>

      {error && <div className="error-msg">{error}</div>}
    </Modal>
  );
}

// ── Confirm delete modal ──────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try { await onConfirm(); onClose(); } catch { setBusy(false); }
  }
  return (
    <Modal title="Confirm Delete" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" onClick={go} disabled={busy}>
          {busy ? 'Deleting…' : 'Delete'}
        </button>
      </>}>
      <p style={{ color: 'var(--text-soft)', fontSize: 14 }}>{message}</p>
    </Modal>
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
  const [expLoading,  setExpLoading]  = useState(true);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  // modal: null | 'editBundle' | 'confirmBundle' | 'addExp' | { type:'editExp', exp } | { type:'confirmExp', exp }
  const [modal, setModal] = useState(null);

  // Final Decision state
  const [fdStatus, setFdStatus] = useState('');
  const [fdNotes,  setFdNotes]  = useState('');
  const [fdSaving, setFdSaving] = useState(false);
  const [fdSaved,  setFdSaved]  = useState(false);

  // ── Load bundle ─────────────────────────────────────────────────────────────
  const loadBundle = useCallback(() => {
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

  useEffect(loadBundle, [loadBundle]);

  // ── Load experiments for this bundle ────────────────────────────────────────
  const loadExperiments = useCallback(() => {
    setExpLoading(true);
    api.get(`/test-bundle-experiments?test_bundle_id=${id}`)
      .then(setExperiments)
      .catch(() => setExperiments([]))
      .finally(() => setExpLoading(false));
  }, [id]);

  useEffect(loadExperiments, [loadExperiments]);

  // ── Load related result_uploads (admin only, by owner) ──────────────────────
  useEffect(() => {
    if (!isAdmin || !bundle?.owner_id) return;
    api.get(`/result-uploads?worker_id=${bundle.owner_id}`)
      .then(setUploads)
      .catch(() => setUploads([]));
  }, [isAdmin, bundle?.id, bundle?.owner_id]); // eslint-disable-line

  // ── Load workers for edit modal ──────────────────────────────────────────────
  useEffect(() => {
    if (isAdmin) api.get('/workers').then(setWorkers).catch(() => {});
  }, [isAdmin]);

  // ── Final Decision save ─────────────────────────────────────────────────────
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

  async function deleteExperiment(expId) {
    await api.delete(`/test-bundle-experiments/${expId}`);
    loadExperiments();
  }

  // ── Render guards ───────────────────────────────────────────────────────────
  if (loading) return <div className="text-muted" style={{ padding: 40 }}>Loading…</div>;
  if (error)   return <div className="error-msg" style={{ margin: 24 }}>{error}</div>;
  if (!bundle) return null;

  const createdAt = bundle.created_at ? new Date(bundle.created_at).toLocaleDateString() : null;
  const updatedAt = bundle.updated_at ? new Date(bundle.updated_at).toLocaleString()      : null;

  return (
    <div>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }}
        onClick={() => navigate('/test-bundles')}>
        <ArrowLeft size={14} strokeWidth={2} /> Back to UBT Bundles
      </button>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
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
              <span className={`badge badge-${BUNDLE_STATUS_BADGE[bundle.status] || 'pending'}`}>
                {statusLabel(bundle.status)}
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
                onClick={() => setModal('editBundle')}>
                <Pencil size={12} strokeWidth={2} /> Edit
              </button>
              <button className="btn btn-ghost btn-sm"
                style={{ color: 'var(--danger)', borderColor: 'var(--danger-dim)', gap: 5 }}
                onClick={() => setModal('confirmBundle')}>
                <Trash2 size={12} strokeWidth={2} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 1: Bundle Overview ────────────────────────────────────────── */}
      <Section icon={Layers} title="Bundle Overview">
        <FieldGrid>
          <Field label="GEO"              value={bundle.geo} />
          <Field label="Offer"            value={bundle.offer} />
          <Field label="Source / Platform" value={bundle.source_platform} />
          <Field label="Account Type"     value={bundle.account_type} />
          <Field label="Proxy Setup"      value={bundle.proxy_setup} />
          <Field label="Owner"            value={bundle.owner_name} />
          {(bundle.start_date || bundle.end_date) && (
            <Field
              label="Dates"
              value={`${bundle.start_date ? new Date(bundle.start_date).toLocaleDateString() : '—'} → ${bundle.end_date ? new Date(bundle.end_date).toLocaleDateString() : 'ongoing'}`}
            />
          )}
        </FieldGrid>
        {updatedAt && (
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)',
                        borderTop: '1px solid var(--border)', paddingTop: 10 }}>
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
              No hypothesis defined. Edit this bundle to add one.
            </div>
          )}
        </div>
      </Section>

      {/* ── SECTION 3: Experiments ────────────────────────────────────────────── */}
      <Section
        icon={FlaskConical}
        title="Experiments"
        color="var(--accent)"
        badge={expLoading ? '…' : experiments.length}
        action={isAdmin && (
          <button className="btn btn-secondary btn-sm" style={{ gap: 5 }}
            onClick={() => setModal('addExp')}>
            <Plus size={13} strokeWidth={2} /> Add Experiment
          </button>
        )}
      >
        {expLoading ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Loading…
          </div>
        ) : experiments.length === 0 ? (
          <SectionEmpty label="No experiments added yet" />
        ) : (
          <>
            {/* Desktop table */}
            <div className="table-wrap hide-mobile">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Variable Tested</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Result Summary</th>
                    {isAdmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {experiments.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{e.name}</td>
                      <td>
                        <span className={`badge badge-${EXP_STATUS_BADGE[e.status] || 'pending'}`}>
                          {statusLabel(e.status)}
                        </span>
                      </td>
                      <td className="text-muted"
                        style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.variable_tested || '—'}
                      </td>
                      <td className="text-muted">
                        {e.start_date ? new Date(e.start_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="text-muted">
                        {e.end_date ? new Date(e.end_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="text-muted"
                        style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.result_summary || '—'}
                      </td>
                      {isAdmin && (
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-ghost btn-xs" style={{ gap: 3 }}
                              onClick={() => setModal({ type: 'editExp', exp: e })}>
                              <Pencil size={11} strokeWidth={2} /> Edit
                            </button>
                            <button className="btn btn-ghost btn-xs"
                              style={{ color: 'var(--danger)', gap: 3 }}
                              onClick={() => setModal({ type: 'confirmExp', exp: e })}>
                              <Trash2 size={11} strokeWidth={2} /> Del
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="mobile-cards">
              {experiments.map(e => (
                <div className="mc-card" key={e.id}>
                  <div className="mc-head">
                    <div className="mc-head-info">
                      <div className="mc-title">{e.name}</div>
                      <div className="mc-badges">
                        <span className={`badge badge-${EXP_STATUS_BADGE[e.status] || 'pending'}`}>
                          {statusLabel(e.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mc-meta">
                    {e.variable_tested && (
                      <div className="mc-meta-item">
                        <div className="mc-meta-label">Variable</div>
                        <div className="mc-meta-value">{e.variable_tested}</div>
                      </div>
                    )}
                    {e.start_date && (
                      <div className="mc-meta-item">
                        <div className="mc-meta-label">Start</div>
                        <div className="mc-meta-value">{new Date(e.start_date).toLocaleDateString()}</div>
                      </div>
                    )}
                    {e.result_summary && (
                      <div className="mc-meta-item mc-meta-full">
                        <div className="mc-meta-label">Result</div>
                        <div className="mc-meta-value">{e.result_summary}</div>
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="mc-actions">
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => setModal({ type: 'editExp', exp: e })}>
                        <Pencil size={12} strokeWidth={2} /> Edit
                      </button>
                      <button className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)', borderColor: 'var(--danger-dim)' }}
                        onClick={() => setModal({ type: 'confirmExp', exp: e })}>
                        <Trash2 size={12} strokeWidth={2} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* ── SECTION 4: Results ────────────────────────────────────────────────── */}
      <Section icon={Upload} title="Results" color="var(--success)"
        badge={uploads.length || undefined}>
        {uploads.length === 0 ? (
          <SectionEmpty label="No results submitted yet" />
        ) : (
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
                          {u.status.replace(/_/g, ' ')}
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
                          {u.status.replace(/_/g, ' ')}
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
            Set the final verdict. Updates the bundle status and is visible to the assigned worker.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            {[
              { value: 'winner',  label: 'Winner',  icon: Trophy,      color: 'var(--success)' },
              { value: 'dead',    label: 'Dead',    icon: XCircle,     color: 'var(--danger)' },
              { value: 'retest',  label: 'Retest',  icon: RefreshCw,   color: 'var(--warning)' },
              { value: 'testing', label: 'Testing', icon: FlaskConical,color: 'var(--accent)' },
              { value: 'draft',   label: 'Draft',   icon: FileText,    color: 'var(--text-muted)' },
            ].map(({ value, label, icon: Icon, color }) => (
              <button key={value} onClick={() => setFdStatus(value)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 'var(--radius)',
                border: `2px solid ${fdStatus === value ? color : 'var(--border)'}`,
                background: fdStatus === value ? `${color}18` : 'transparent',
                color: fdStatus === value ? color : 'var(--text-muted)',
                cursor: 'pointer', fontSize: 13, fontWeight: fdStatus === value ? 700 : 500,
                transition: 'all 0.15s',
              }}>
                <Icon size={14} strokeWidth={2} /> {label}
                {fdStatus === value && <CheckCircle2 size={13} strokeWidth={2} />}
              </button>
            ))}
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Decision Notes</label>
            <textarea className="form-control" rows={3} value={fdNotes}
              onChange={e => setFdNotes(e.target.value)}
              placeholder="Why this decision? Key observations, scaling plan, or reason for archival…" />
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

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {modal === 'editBundle' && (
        <EditBundleModal bundle={bundle} workers={workers}
          onSave={loadBundle} onClose={() => setModal(null)} />
      )}
      {modal === 'confirmBundle' && (
        <ConfirmModal
          message={`Delete bundle "${bundle.name}"? All experiments inside will also be deleted.`}
          onConfirm={deleteBundle}
          onClose={() => setModal(null)} />
      )}
      {modal === 'addExp' && (
        <ExperimentModal bundleId={id}
          onSave={loadExperiments} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'editExp' && (
        <ExperimentModal initial={modal.exp} bundleId={id}
          onSave={loadExperiments} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'confirmExp' && (
        <ConfirmModal
          message={`Delete experiment "${modal.exp.name}"?`}
          onConfirm={() => deleteExperiment(modal.exp.id)}
          onClose={() => setModal(null)} />
      )}
    </div>
  );
}
