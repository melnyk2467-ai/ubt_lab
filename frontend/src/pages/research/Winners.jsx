import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/Modal';

function WinnerModal({ winner, results, bundles, onSave, onClose }) {
  const [form, setForm] = useState({
    title:            winner?.title            || '',
    linked_result_id: winner?.linked_result_id || '',
    linked_bundle_id: winner?.linked_bundle_id || '',
    winning_reason:   winner?.winning_reason   || '',
    scaling_notes:    winner?.scaling_notes    || '',
  });
  const [err, setErr]     = useState('');
  const [saving, setSave] = useState(false);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setErr(''); setSave(true);
    try {
      const body = {
        ...form,
        linked_result_id: form.linked_result_id || null,
        linked_bundle_id: form.linked_bundle_id || null,
      };
      if (winner) await api.put(`/research/winners/${winner.id}`, body);
      else        await api.post('/research/winners', body);
      onSave();
    } catch (ex) { setErr(ex.message); }
    finally { setSave(false); }
  }

  return (
    <Modal title={winner ? 'Edit Winner' : 'Promote to Winner'} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
               <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Winner Title</label>
          <input className="form-control" value={form.title} onChange={e => set('title', e.target.value)} required autoFocus
            placeholder="Name this winning concept" />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Linked Result</label>
            <select className="form-control" value={form.linked_result_id} onChange={e => set('linked_result_id', e.target.value)}>
              <option value="">None</option>
              {results.map(r => <option key={r.id} value={r.id}>{r.hypothesis_title} ({new Date(r.created_at).toLocaleDateString()})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Linked Bundle</label>
            <select className="form-control" value={form.linked_bundle_id} onChange={e => set('linked_bundle_id', e.target.value)}>
              <option value="">None</option>
              {bundles.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Why It Won</label>
          <textarea className="form-control" value={form.winning_reason} onChange={e => set('winning_reason', e.target.value)}
            placeholder="What made this concept outperform? Key observations…" />
        </div>
        <div className="form-group">
          <label className="form-label">Scaling Notes</label>
          <textarea className="form-control" value={form.scaling_notes} onChange={e => set('scaling_notes', e.target.value)}
            placeholder="How to scale this? Accounts, geos, variations…" />
        </div>
        {err && <div className="error-msg">{err}</div>}
      </form>
    </Modal>
  );
}

export default function Winners() {
  const { user }  = useAuth();
  const isAdmin   = user?.role === 'admin';
  const [winners, setWinners]   = useState([]);
  const [results, setResults]   = useState([]);
  const [bundles, setBundles]   = useState([]);
  const [modal, setModal]       = useState(null);

  function load() {
    api.get('/research/winners').then(setWinners).catch(console.error);
  }

  useEffect(() => {
    load();
    api.get('/research/results').then(setResults);
    api.get('/bundles').then(setBundles);
  }, []);

  async function del(id) {
    if (!confirm('Remove this winner?')) return;
    await api.delete(`/research/winners/${id}`);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Winners</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setModal('create')}>
            🏆 Promote to Winner
          </button>
        )}
      </div>

      {winners.length === 0 ? (
        <div className="card">
          <div className="empty">No winners yet — run experiments, record results, then promote the best ones here.</div>
        </div>
      ) : (
        <div className="winner-grid">
          {winners.map(w => (
            <div key={w.id} className="winner-card">
              <div className="winner-card-crown">🏆</div>
              <div className="winner-card-title">{w.title}</div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, marginBottom: 14 }}>
                {w.bundle_name && (
                  <span className="badge badge-active">{w.bundle_name}</span>
                )}
                {w.hypothesis_title && (
                  <span className="badge badge-pending" style={{ fontSize: 10 }}>{w.hypothesis_title}</span>
                )}
              </div>

              {w.winning_reason && (
                <div className="winner-card-section">
                  <div className="winner-card-label">Why It Won</div>
                  <div className="winner-card-text">{w.winning_reason}</div>
                </div>
              )}

              {w.scaling_notes && (
                <div className="winner-card-section">
                  <div className="winner-card-label">Scaling Notes</div>
                  <div className="winner-card-text">{w.scaling_notes}</div>
                </div>
              )}

              <div className="winner-card-footer">
                <span className="text-muted" style={{ fontSize: 12 }}>
                  {new Date(w.created_at).toLocaleDateString()}
                </span>
                {isAdmin && (
                  <div className="td-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setModal(w)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => del(w.id)}>Del</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <WinnerModal
          winner={modal === 'create' ? null : modal}
          results={results}
          bundles={bundles}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
