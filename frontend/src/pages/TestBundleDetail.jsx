import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import {
  ArrowLeft, Pencil, Trash2, Layers,
  Globe, Tag, Monitor, Users, Shield,
  Lightbulb, CalendarDays, FileText,
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

// ── Detail field row ───────────────────────────────────────────────────────────
function Field({ icon: Icon, label, value, mono = false }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: 2, color: 'var(--accent)', flexShrink: 0 }}>
        <Icon size={14} strokeWidth={1.75} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-soft)', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-word' }}>
          {value}
        </div>
      </div>
    </div>
  );
}

// ── Edit modal (reuses full form) ─────────────────────────────────────────────
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
      onSave();
      onClose();
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

// ── Confirm delete modal ───────────────────────────────────────────────────────
function ConfirmModal({ name, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try { await onConfirm(); onClose(); }
    catch { setBusy(false); }
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
        Delete <strong style={{ color: 'var(--text)' }}>"{name}"</strong>?
        This cannot be undone.
      </p>
    </Modal>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TestBundleDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const isAdmin   = user?.role === 'admin';

  const [bundle,  setBundle]  = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [modal,   setModal]   = useState(null); // 'edit' | 'confirm'

  const load = useCallback(() => {
    api.get(`/test-bundles/${id}`)
      .then(b => { setBundle(b); setError(''); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);
  useEffect(() => {
    if (isAdmin) api.get('/workers').then(setWorkers).catch(() => {});
  }, [isAdmin]);

  async function deleteBundle() {
    await api.delete(`/test-bundles/${id}`);
    navigate('/test-bundles');
  }

  if (loading) return <div className="text-muted" style={{ padding: 40 }}>Loading…</div>;
  if (error)   return <div className="error-msg" style={{ margin: 24 }}>{error}</div>;
  if (!bundle) return null;

  const updatedAt = bundle.updated_at
    ? new Date(bundle.updated_at).toLocaleString()
    : null;
  const createdAt = bundle.created_at
    ? new Date(bundle.created_at).toLocaleDateString()
    : null;

  return (
    <div>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }}
        onClick={() => navigate('/test-bundles')}>
        <ArrowLeft size={14} strokeWidth={2} /> Back to UBT Bundles
      </button>

      {/* Header card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          {/* Icon */}
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius)', flexShrink: 0,
            background: 'var(--accent-dim)', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Layers size={22} strokeWidth={1.75} />
          </div>

          {/* Name + status */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px', marginBottom: 8 }}>
              {bundle.name}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className={`badge badge-${STATUS_BADGE[bundle.status] || 'pending'}`}>
                {bundle.status.charAt(0).toUpperCase() + bundle.status.slice(1)}
              </span>
              {bundle.geo && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Globe size={11} strokeWidth={2} /> {bundle.geo}
                </span>
              )}
              {bundle.source_platform && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Monitor size={11} strokeWidth={2} /> {bundle.source_platform}
                </span>
              )}
              {bundle.owner_name && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Users size={11} strokeWidth={2} /> {bundle.owner_name}
                </span>
              )}
              {createdAt && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Created {createdAt}</span>
              )}
            </div>
          </div>

          {/* Actions */}
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

      {/* Details card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 4 }}>
          Bundle Details
        </div>

        <Field icon={Tag}         label="Offer"           value={bundle.offer} />
        <Field icon={Globe}       label="GEO"             value={bundle.geo} />
        <Field icon={Monitor}     label="Source / Platform" value={bundle.source_platform} />
        <Field icon={Users}       label="Account Type"    value={bundle.account_type} />
        <Field icon={Shield}      label="Proxy Setup"     value={bundle.proxy_setup} />
        <Field icon={Lightbulb}   label="Creative Angle"  value={bundle.creative_angle} />
        <Field icon={Lightbulb}   label="Hypothesis"      value={bundle.hypothesis} />

        {/* Dates */}
        {(bundle.start_date || bundle.end_date) && (
          <div style={{ display: 'flex', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: 2, color: 'var(--accent)', flexShrink: 0 }}>
              <CalendarDays size={14} strokeWidth={1.75} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>
                Dates
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-soft)' }}>
                {bundle.start_date ? new Date(bundle.start_date).toLocaleDateString() : '—'}
                {' → '}
                {bundle.end_date   ? new Date(bundle.end_date).toLocaleDateString()   : 'ongoing'}
              </div>
            </div>
          </div>
        )}

        <Field icon={Users}    label="Responsible Worker" value={bundle.owner_name} />
        <Field icon={FileText} label="Notes"              value={bundle.notes} />

        {/* Last updated footer */}
        {updatedAt && (
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)' }}>
            Last updated: {updatedAt}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === 'edit' && (
        <EditModal
          bundle={bundle}
          workers={workers}
          onSave={load}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'confirm' && (
        <ConfirmModal
          name={bundle.name}
          onConfirm={deleteBundle}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
