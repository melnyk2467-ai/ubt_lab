import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/Modal';

const STATUSES   = ['planned', 'testing', 'completed', 'failed'];
const PRIORITIES = ['low', 'medium', 'high'];
const STATUS_BADGE   = { planned: 'pending', testing: 'testing', completed: 'active', failed: 'dead' };
const PRIORITY_BADGE = { low: 'worker', medium: 'testing', high: 'active' };

function HypothesisModal({ hyp, patterns, onSave, onClose }) {
  const [form, setForm] = useState({
    title:             hyp?.title             || '',
    description:       hyp?.description       || '',
    linked_pattern_id: hyp?.linked_pattern_id || '',
    expected_result:   hyp?.expected_result   || '',
    priority:          hyp?.priority          || 'medium',
    status:            hyp?.status            || 'planned',
  });
  const [err, setErr]     = useState('');
  const [saving, setSave] = useState(false);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setErr(''); setSave(true);
    try {
      const body = { ...form, linked_pattern_id: form.linked_pattern_id || null };
      if (hyp) await api.put(`/research/hypotheses/${hyp.id}`, body);
      else     await api.post('/research/hypotheses', body);
      onSave();
    } catch (ex) { setErr(ex.message); }
    finally { setSave(false); }
  }

  return (
    <Modal title={hyp ? 'Edit Hypothesis' : 'New Hypothesis'} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
               <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Hypothesis Statement</label>
          <input className="form-control" value={form.title} onChange={e => set('title', e.target.value)} required autoFocus
            placeholder="If we do X, then Y will happen…" />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-control" value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Linked Pattern</label>
          <select className="form-control" value={form.linked_pattern_id} onChange={e => set('linked_pattern_id', e.target.value)}>
            <option value="">None</option>
            {patterns.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Expected Result</label>
          <textarea className="form-control" value={form.expected_result} onChange={e => set('expected_result', e.target.value)}
            placeholder="What outcome do you expect?" style={{ minHeight: 64 }} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-control" value={form.priority} onChange={e => set('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {err && <div className="error-msg">{err}</div>}
      </form>
    </Modal>
  );
}

export default function Hypotheses() {
  const { user }  = useAuth();
  const isAdmin   = user?.role === 'admin';
  const [hyps, setHyps]       = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [modal, setModal] = useState(null);

  function load() {
    const p = new URLSearchParams();
    if (filterStatus)   p.set('status', filterStatus);
    if (filterPriority) p.set('priority', filterPriority);
    const q = p.toString() ? '?' + p.toString() : '';
    api.get(`/research/hypotheses${q}`).then(setHyps).catch(console.error);
  }

  useEffect(load, [filterStatus, filterPriority]);
  useEffect(() => { api.get('/research/patterns').then(setPatterns); }, []);

  async function quickStatus(hyp, status) {
    await api.put(`/research/hypotheses/${hyp.id}`, { status });
    load();
  }

  async function del(id) {
    if (!confirm('Delete this hypothesis?')) return;
    await api.delete(`/research/hypotheses/${id}`);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Hypotheses</h1>
        {isAdmin && <button className="btn btn-primary" onClick={() => setModal('create')}>+ New Hypothesis</button>}
      </div>

      <div className="filter-bar">
        <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="form-control" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      <div className="card">
        {/* Desktop table */}
        <div className="table-wrap hide-mobile">
          <table>
            <thead>
              <tr><th>Statement</th><th>Pattern</th><th>Priority</th><th>Status</th><th>Creator</th><th>Created</th>{isAdmin && <th></th>}</tr>
            </thead>
            <tbody>
              {hyps.length === 0 && <tr><td colSpan={7} className="empty">No hypotheses yet</td></tr>}
              {hyps.map(h => (
                <tr key={h.id}>
                  <td style={{ fontWeight: 500, maxWidth: 300 }}>{h.title}</td>
                  <td className="text-muted">{h.pattern_title || '—'}</td>
                  <td><span className={`badge badge-${PRIORITY_BADGE[h.priority] || h.priority}`}>{h.priority}</span></td>
                  <td>
                    {isAdmin ? (
                      <select className="form-control" style={{ padding: '3px 6px', width: 'auto', fontSize: 12 }}
                        value={h.status} onChange={e => quickStatus(h, e.target.value)}>
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className={`badge badge-${STATUS_BADGE[h.status] || h.status}`}>{h.status}</span>
                    )}
                  </td>
                  <td className="text-muted">{h.creator_name}</td>
                  <td className="text-muted">{new Date(h.created_at).toLocaleDateString()}</td>
                  {isAdmin && (
                    <td><div className="td-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => setModal(h)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => del(h.id)}>Del</button>
                    </div></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-cards">
          {hyps.length === 0 && <div className="empty">No hypotheses yet</div>}
          {hyps.map(h => (
            <div className="mc-card" key={h.id}>
              <div className="mc-head">
                <div className="mc-head-info">
                  <div className="mc-title" style={{ whiteSpace: 'normal', WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 14 }}>{h.title}</div>
                  <div className="mc-badges" style={{ marginTop: 6 }}>
                    <span className={`badge badge-${PRIORITY_BADGE[h.priority] || h.priority}`}>{h.priority}</span>
                    {!isAdmin && <span className={`badge badge-${STATUS_BADGE[h.status] || h.status}`}>{h.status}</span>}
                  </div>
                </div>
              </div>
              {isAdmin && (
                <div style={{ marginBottom: 10 }}>
                  <div className="mc-meta-label" style={{ marginBottom: 4 }}>Status</div>
                  <select className="mc-select" value={h.status} onChange={e => quickStatus(h, e.target.value)}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div className="mc-meta">
                {h.pattern_title && (
                  <div className="mc-meta-item mc-meta-full">
                    <div className="mc-meta-label">Pattern</div>
                    <div className="mc-meta-value">{h.pattern_title}</div>
                  </div>
                )}
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Creator</div>
                  <div className="mc-meta-value">{h.creator_name}</div>
                </div>
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Created</div>
                  <div className="mc-meta-value">{new Date(h.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              {isAdmin && (
                <div className="mc-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => setModal(h)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => del(h.id)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <HypothesisModal
          hyp={modal === 'create' ? null : modal}
          patterns={patterns}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
