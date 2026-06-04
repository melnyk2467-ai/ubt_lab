import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { Plus, Layers, Search, ExternalLink } from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUSES = ['draft', 'testing', 'winner', 'dead', 'retest'];

const STATUS_BADGE = {
  draft:   'pending',
  testing: 'testing',
  winner:  'active',
  dead:    'banned',
  retest:  'warmup',
};

const EMPTY_FORM = {
  name: '', status: 'draft', geo: '', offer: '', source_platform: '',
  account_type: '', proxy_setup: '', creative_angle: '', hypothesis: '',
  owner_id: '', start_date: '', end_date: '', notes: '',
};

// ── Bundle form modal ──────────────────────────────────────────────────────────
function BundleModal({ initial, workers, onSave, onClose }) {
  const [form, setForm] = useState(initial
    ? {
        ...initial,
        owner_id:   initial.owner_id   || '',
        start_date: initial.start_date ? initial.start_date.slice(0, 10) : '',
        end_date:   initial.end_date   ? initial.end_date.slice(0, 10)   : '',
      }
    : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, owner_id: form.owner_id || null };
      if (initial?.id) await api.put(`/test-bundles/${initial.id}`, payload);
      else             await api.post('/test-bundles', payload);
      onSave();
      onClose();
    } catch (e) { setError(e.message); setSaving(false); }
  }

  return (
    <Modal
      title={initial?.id ? 'Edit UBT Bundle' : 'New UBT Bundle'}
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </>}
    >
      {/* Row 1: name + status */}
      <div className="form-row">
        <div className="form-group" style={{ flex: 2 }}>
          <label className="form-label">Name *</label>
          <input className="form-control" value={form.name}
            onChange={e => set('name', e.target.value)} placeholder="e.g. US Tier1 Push v3" />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Status</label>
          <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Row 2: geo + offer */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">GEO</label>
          <input className="form-control" value={form.geo}
            onChange={e => set('geo', e.target.value)} placeholder="US, UK, DE…" />
        </div>
        <div className="form-group">
          <label className="form-label">Offer</label>
          <input className="form-control" value={form.offer}
            onChange={e => set('offer', e.target.value)} placeholder="Offer name / ID" />
        </div>
      </div>

      {/* Row 3: source_platform + account_type */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Source / Platform</label>
          <input className="form-control" value={form.source_platform}
            onChange={e => set('source_platform', e.target.value)} placeholder="TikTok, Facebook, Push…" />
        </div>
        <div className="form-group">
          <label className="form-label">Account Type</label>
          <input className="form-control" value={form.account_type}
            onChange={e => set('account_type', e.target.value)} placeholder="Farmed, Agency, KYC…" />
        </div>
      </div>

      {/* Row 4: proxy_setup */}
      <div className="form-group">
        <label className="form-label">Proxy Setup</label>
        <input className="form-control" value={form.proxy_setup}
          onChange={e => set('proxy_setup', e.target.value)} placeholder="Residential US, Mobile RU…" />
      </div>

      {/* Row 5: creative_angle */}
      <div className="form-group">
        <label className="form-label">Creative Angle</label>
        <input className="form-control" value={form.creative_angle}
          onChange={e => set('creative_angle', e.target.value)} placeholder="Emotional, Problem-solution, Native…" />
      </div>

      {/* Row 6: hypothesis */}
      <div className="form-group">
        <label className="form-label">Hypothesis</label>
        <textarea className="form-control" rows={2} value={form.hypothesis}
          onChange={e => set('hypothesis', e.target.value)}
          placeholder="What are you testing and what result do you expect?" />
      </div>

      {/* Row 7: owner + dates */}
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
          <input className="form-control" type="date" value={form.start_date}
            onChange={e => set('start_date', e.target.value)} />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">End Date</label>
          <input className="form-control" type="date" value={form.end_date}
            onChange={e => set('end_date', e.target.value)} />
        </div>
      </div>

      {/* Row 8: notes */}
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-control" rows={3} value={form.notes}
          onChange={e => set('notes', e.target.value)} placeholder="Additional observations, links, context…" />
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

// ── Main page ──────────────────────────────────────────────────────────────────
export default function TestBundles() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const isAdmin     = user?.role === 'admin';

  const [bundles,  setBundles]  = useState([]);
  const [workers,  setWorkers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null); // null | 'create' | bundle | { type:'confirm', bundle }

  // Filters
  const [search,          setSearch]          = useState('');
  const [filterStatus,    setFilterStatus]    = useState('');
  const [filterGeo,       setFilterGeo]       = useState('');
  const [filterOffer,     setFilterOffer]     = useState('');
  const [filterPlatform,  setFilterPlatform]  = useState('');
  const [filterWorker,    setFilterWorker]    = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)         params.set('search',          search);
    if (filterStatus)   params.set('status',          filterStatus);
    if (filterGeo)      params.set('geo',             filterGeo);
    if (filterOffer)    params.set('offer',           filterOffer);
    if (filterPlatform) params.set('source_platform', filterPlatform);
    if (filterWorker)   params.set('owner_id',        filterWorker);
    const qs = params.toString() ? `?${params}` : '';
    api.get(`/test-bundles${qs}`)
      .then(setBundles)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, filterStatus, filterGeo, filterOffer, filterPlatform, filterWorker]);

  useEffect(load, [load]);

  useEffect(() => {
    if (isAdmin) {
      api.get('/workers').then(setWorkers).catch(console.error);
    }
  }, [isAdmin]);

  function clearFilters() {
    setSearch(''); setFilterStatus(''); setFilterGeo('');
    setFilterOffer(''); setFilterPlatform(''); setFilterWorker('');
  }

  const hasFilters = search || filterStatus || filterGeo || filterOffer || filterPlatform || filterWorker;

  // Derived filter options from current data
  const geos      = [...new Set(bundles.map(b => b.geo).filter(Boolean))].sort();
  const offers    = [...new Set(bundles.map(b => b.offer).filter(Boolean))].sort();
  const platforms = [...new Set(bundles.map(b => b.source_platform).filter(Boolean))].sort();

  async function deleteBundle(id) {
    await api.delete(`/test-bundles/${id}`);
    load();
  }

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">
          <Layers size={20} strokeWidth={1.75} style={{ color: 'var(--accent)', marginRight: 8, verticalAlign: 'middle' }} />
          UBT Bundles
        </h1>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={() => setModal('create')} style={{ gap: 6 }}>
            <Plus size={14} strokeWidth={2} /> New Bundle
          </button>
        )}
      </div>

      {/* Search + filters */}
      <div className="filter-bar" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
          <Search size={13} strokeWidth={2} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            className="form-control"
            style={{ paddingLeft: 30 }}
            placeholder="Search name, offer, hypothesis, notes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select className="form-control" style={{ minWidth: 120 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>

        <select className="form-control" style={{ minWidth: 100 }} value={filterGeo} onChange={e => setFilterGeo(e.target.value)}>
          <option value="">All GEOs</option>
          {geos.map(g => <option key={g}>{g}</option>)}
        </select>

        <select className="form-control" style={{ minWidth: 120 }} value={filterOffer} onChange={e => setFilterOffer(e.target.value)}>
          <option value="">All offers</option>
          {offers.map(o => <option key={o}>{o}</option>)}
        </select>

        <select className="form-control" style={{ minWidth: 130 }} value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
          <option value="">All platforms</option>
          {platforms.map(p => <option key={p}>{p}</option>)}
        </select>

        {isAdmin && (
          <select className="form-control" style={{ minWidth: 150 }} value={filterWorker} onChange={e => setFilterWorker(e.target.value)}>
            <option value="">All workers</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}

        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear</button>
        )}
      </div>

      {/* Summary strip */}
      {!loading && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          {bundles.length} bundle{bundles.length !== 1 ? 's' : ''}
          {hasFilters ? ' (filtered)' : ''}
        </div>
      )}

      {/* ── Desktop table ── */}
      <div className="card">
        <div className="table-wrap hide-mobile">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>GEO</th>
                <th>Offer</th>
                <th>Platform</th>
                <th>Owner</th>
                <th>Start</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="empty">Loading…</td></tr>}
              {!loading && bundles.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty">
                    {hasFilters ? 'No bundles match your filters' : 'No bundles yet — click New Bundle to create one'}
                  </td>
                </tr>
              )}
              {bundles.map(b => (
                <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/test-bundles/${b.id}`)}>
                  <td style={{ fontWeight: 600 }}>{b.name}</td>
                  <td>
                    <span className={`badge badge-${STATUS_BADGE[b.status] || 'pending'}`}>
                      {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                    </span>
                  </td>
                  <td className="text-muted">{b.geo || '—'}</td>
                  <td className="text-muted" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.offer || '—'}</td>
                  <td className="text-muted">{b.source_platform || '—'}</td>
                  <td className="text-muted">{b.owner_name || '—'}</td>
                  <td className="text-muted">{b.start_date ? new Date(b.start_date).toLocaleDateString() : '—'}</td>
                  {isAdmin && (
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm"
                          onClick={() => setModal(b)}>
                          Edit
                        </button>
                        <button className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => setModal({ type: 'confirm', bundle: b })}>
                          Del
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Mobile cards ── */}
        <div className="mobile-cards">
          {loading && <div className="empty">Loading…</div>}
          {!loading && bundles.length === 0 && (
            <div className="empty">
              {hasFilters ? 'No bundles match your filters' : 'No bundles yet'}
            </div>
          )}
          {bundles.map(b => (
            <div className="mc-card" key={b.id}>
              <div className="mc-head" style={{ cursor: 'pointer' }} onClick={() => navigate(`/test-bundles/${b.id}`)}>
                <div className="mc-head-info">
                  <div className="mc-title">{b.name}</div>
                  <div className="mc-badges">
                    <span className={`badge badge-${STATUS_BADGE[b.status] || 'pending'}`}>
                      {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                    </span>
                    {b.geo && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.geo}</span>}
                  </div>
                </div>
              </div>
              <div className="mc-meta">
                {b.offer && (
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Offer</div>
                    <div className="mc-meta-value">{b.offer}</div>
                  </div>
                )}
                {b.source_platform && (
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Platform</div>
                    <div className="mc-meta-value">{b.source_platform}</div>
                  </div>
                )}
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Owner</div>
                  <div className="mc-meta-value">{b.owner_name || '—'}</div>
                </div>
                {b.start_date && (
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Start</div>
                    <div className="mc-meta-value">{new Date(b.start_date).toLocaleDateString()}</div>
                  </div>
                )}
              </div>
              <div className="mc-actions">
                <button className="btn btn-secondary btn-sm" style={{ gap: 5 }}
                  onClick={() => navigate(`/test-bundles/${b.id}`)}>
                  <ExternalLink size={12} strokeWidth={2} /> View
                </button>
                {isAdmin && (
                  <>
                    <button className="btn btn-secondary btn-sm"
                      onClick={() => setModal(b)}>
                      Edit
                    </button>
                    <button className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger-dim)' }}
                      onClick={() => setModal({ type: 'confirm', bundle: b })}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {(modal === 'create' || (modal && !modal.type && modal.name !== undefined)) && (
        <BundleModal
          initial={modal === 'create' ? null : modal}
          workers={workers}
          onSave={load}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'confirm' && (
        <ConfirmModal
          name={modal.bundle.name}
          onConfirm={() => deleteBundle(modal.bundle.id)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
