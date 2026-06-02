import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';

const STATUSES = ['testing', 'working', 'dead'];
const STATUS_COLORS = { testing: 'warmup', working: 'active', dead: 'banned' };

function BundleModal({ bundle, offers, onSave, onClose }) {
  const [form, setForm] = useState({
    offer_id: bundle?.offer_id || (offers[0]?.id || ''),
    name:     bundle?.name     || '',
    angle:    bundle?.angle    || '',
    hook:     bundle?.hook     || '',
    concept:  bundle?.concept  || '',
    status:   bundle?.status   || 'testing',
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      if (bundle) await api.put(`/bundles/${bundle.id}`, form);
      else        await api.post('/bundles', form);
      onSave();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={bundle ? 'Edit Bundle' : 'Create Bundle'} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
               <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Offer</label>
          <select className="form-control" value={form.offer_id} onChange={e => set('offer_id', e.target.value)} required>
            {offers.map(o => <option key={o.id} value={o.id}>{o.name} ({o.geo})</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Bundle Name</label>
            <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Angle</label>
          <input className="form-control" value={form.angle} onChange={e => set('angle', e.target.value)} placeholder="e.g. problem-solution" />
        </div>
        <div className="form-group">
          <label className="form-label">Hook</label>
          <input className="form-control" value={form.hook} onChange={e => set('hook', e.target.value)} placeholder="Opening line / visual hook" />
        </div>
        <div className="form-group">
          <label className="form-label">Concept</label>
          <textarea className="form-control" value={form.concept} onChange={e => set('concept', e.target.value)} placeholder="Full description of the content concept" />
        </div>
        {error && <div className="error-msg">{error}</div>}
      </form>
    </Modal>
  );
}

export default function Bundles() {
  const [bundles, setBundles] = useState([]);
  const [offers, setOffers]   = useState([]);
  const [filterOffer, setFilterOffer] = useState('');
  const [modal, setModal] = useState(null);

  async function load() {
    const q = filterOffer ? `?offer_id=${filterOffer}` : '';
    api.get(`/bundles${q}`).then(setBundles).catch(console.error);
  }

  useEffect(() => { api.get('/offers').then(setOffers); }, []);
  useEffect(() => { load(); }, [filterOffer]);

  async function quickStatus(bundle, status) {
    await api.put(`/bundles/${bundle.id}`, { status });
    load();
  }

  async function del(id) {
    if (!confirm('Delete this bundle?')) return;
    await api.delete(`/bundles/${id}`);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Bundles</h1>
        <button className="btn btn-primary" onClick={() => setModal('create')}>+ Create Bundle</button>
      </div>

      <div className="filter-bar">
        <select className="form-control" value={filterOffer} onChange={e => setFilterOffer(e.target.value)}>
          <option value="">All Offers</option>
          {offers.map(o => <option key={o.id} value={o.id}>{o.name} ({o.geo})</option>)}
        </select>
      </div>

      <div className="card">
        {/* Desktop table */}
        <div className="table-wrap hide-mobile">
          <table>
            <thead>
              <tr><th>Name</th><th>Offer</th><th>Angle</th><th>Hook</th><th>Status</th><th>Creator</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {bundles.length === 0 && <tr><td colSpan={8} className="empty">No bundles yet</td></tr>}
              {bundles.map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 500 }}>{b.name}</td>
                  <td className="text-muted">{b.offer_name}</td>
                  <td className="text-muted">{b.angle}</td>
                  <td className="text-muted" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.hook}</td>
                  <td>
                    <select className="form-control" style={{ padding: '3px 6px', width: 'auto', fontSize: 12 }}
                      value={b.status} onChange={e => quickStatus(b, e.target.value)}>
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="text-muted">{b.creator_name}</td>
                  <td className="text-muted">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td><div className="td-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setModal(b)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => del(b.id)}>Del</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-cards">
          {bundles.length === 0 && <div className="empty">No bundles yet</div>}
          {bundles.map(b => (
            <div className="mc-card" key={b.id}>
              <div className="mc-head">
                <div className="mc-head-info">
                  <div className="mc-title">{b.name}</div>
                  <div className="mc-badges">
                    <span className={`badge badge-${STATUS_COLORS[b.status] || b.status}`}>{b.status}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.offer_name}</span>
                  </div>
                </div>
              </div>
              <div className="mc-meta" style={{ marginBottom: 10 }}>
                <div className="mc-meta-item mc-meta-full">
                  <div className="mc-meta-label">Status</div>
                  <select className="mc-select" value={b.status} onChange={e => quickStatus(b, e.target.value)}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                {b.angle && (
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Angle</div>
                    <div className="mc-meta-value">{b.angle}</div>
                  </div>
                )}
                {b.hook && (
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Hook</div>
                    <div className="mc-meta-value">{b.hook}</div>
                  </div>
                )}
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Creator</div>
                  <div className="mc-meta-value">{b.creator_name}</div>
                </div>
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Created</div>
                  <div className="mc-meta-value">{new Date(b.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="mc-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setModal(b)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => del(b.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <BundleModal
          bundle={modal === 'create' ? null : modal}
          offers={offers}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
