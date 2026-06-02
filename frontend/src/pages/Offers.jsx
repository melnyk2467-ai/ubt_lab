import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';

function OfferModal({ offer, onSave, onClose }) {
  const [form, setForm] = useState({
    name:      offer?.name      || '',
    geo:       offer?.geo       || '',
    payout:    offer?.payout    || 0,
    notes:     offer?.notes     || '',
    is_active: offer?.is_active ?? true,
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      if (offer) await api.put(`/offers/${offer.id}`, form);
      else       await api.post('/offers', form);
      onSave();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={offer ? 'Edit Offer' : 'Create Offer'} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
               <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Offer Name</label>
          <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} required />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">GEO</label>
            <input className="form-control" value={form.geo} onChange={e => set('geo', e.target.value)} placeholder="US, UK, DE…" required />
          </div>
          <div className="form-group">
            <label className="form-label">Payout ($)</label>
            <input className="form-control" type="number" step="0.01" value={form.payout} onChange={e => set('payout', parseFloat(e.target.value))} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-control" value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-control" value={form.is_active} onChange={e => set('is_active', e.target.value === 'true')}>
            <option value="true">Active</option>
            <option value="false">Paused</option>
          </select>
        </div>
        {error && <div className="error-msg">{error}</div>}
      </form>
    </Modal>
  );
}

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [modal, setModal]   = useState(null);

  function load() { api.get('/offers').then(setOffers).catch(console.error); }
  useEffect(load, []);

  async function del(id) {
    if (!confirm('Delete this offer?')) return;
    await api.delete(`/offers/${id}`);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Offers</h1>
        <button className="btn btn-primary" onClick={() => setModal('create')}>+ Create Offer</button>
      </div>

      <div className="card">
        {/* Desktop table */}
        <div className="table-wrap hide-mobile">
          <table>
            <thead>
              <tr><th>Name</th><th>GEO</th><th>Payout</th><th>Status</th><th>Notes</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {offers.length === 0 && <tr><td colSpan={7} className="empty">No offers yet</td></tr>}
              {offers.map(o => (
                <tr key={o.id}>
                  <td>{o.name}</td>
                  <td>{o.geo}</td>
                  <td className="num">${o.payout.toFixed(2)}</td>
                  <td><span className={`badge badge-${o.is_active ? 'active' : 'banned'}`}>{o.is_active ? 'Active' : 'Paused'}</span></td>
                  <td className="text-muted" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.notes}</td>
                  <td className="text-muted">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td><div className="td-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setModal(o)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => del(o.id)}>Del</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-cards">
          {offers.length === 0 && <div className="empty">No offers yet</div>}
          {offers.map(o => (
            <div className="mc-card" key={o.id}>
              <div className="mc-head">
                <div className="mc-head-info">
                  <div className="mc-title">{o.name}</div>
                  <div className="mc-badges">
                    <span className={`badge badge-${o.is_active ? 'active' : 'banned'}`}>{o.is_active ? 'Active' : 'Paused'}</span>
                  </div>
                </div>
              </div>
              <div className="mc-meta">
                <div className="mc-meta-item">
                  <div className="mc-meta-label">GEO</div>
                  <div className="mc-meta-value">{o.geo}</div>
                </div>
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Payout</div>
                  <div className="mc-meta-value num" style={{ fontWeight: 700, color: 'var(--success)' }}>${o.payout.toFixed(2)}</div>
                </div>
                {o.notes && (
                  <div className="mc-meta-item mc-meta-full">
                    <div className="mc-meta-label">Notes</div>
                    <div className="mc-meta-value" style={{ whiteSpace: 'normal', WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{o.notes}</div>
                  </div>
                )}
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Created</div>
                  <div className="mc-meta-value">{new Date(o.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="mc-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setModal(o)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => del(o.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <OfferModal
          offer={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
