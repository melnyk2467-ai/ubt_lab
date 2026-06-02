import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/Modal';

const STATUSES = ['active', 'completed'];

function ExperimentModal({ exp, hypotheses, workers, accounts, bundles, onSave, onClose }) {
  const [form, setForm] = useState({
    hypothesis_id:       exp?.hypothesis_id       || (hypotheses[0]?.id || ''),
    assigned_worker_id:  exp?.assigned_worker_id  || '',
    assigned_account_id: exp?.assigned_account_id || '',
    assigned_bundle_id:  exp?.assigned_bundle_id  || '',
    start_date:          exp?.start_date          ? exp.start_date.slice(0, 10) : '',
    end_date:            exp?.end_date            ? exp.end_date.slice(0, 10)   : '',
    status:              exp?.status              || 'active',
    notes:               exp?.notes              || '',
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
        assigned_worker_id:  form.assigned_worker_id  || null,
        assigned_account_id: form.assigned_account_id || null,
        assigned_bundle_id:  form.assigned_bundle_id  || null,
        start_date:          form.start_date || null,
        end_date:            form.end_date   || null,
      };
      if (exp) await api.put(`/research/experiments/${exp.id}`, body);
      else     await api.post('/research/experiments', body);
      onSave();
    } catch (ex) { setErr(ex.message); }
    finally { setSave(false); }
  }

  return (
    <Modal title={exp ? 'Edit Experiment' : 'New Experiment'} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
               <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Hypothesis</label>
          <select className="form-control" value={form.hypothesis_id} onChange={e => set('hypothesis_id', e.target.value)} required>
            <option value="">— Select —</option>
            {hypotheses.map(h => <option key={h.id} value={h.id}>{h.title}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Assigned Worker</label>
          <select className="form-control" value={form.assigned_worker_id} onChange={e => set('assigned_worker_id', e.target.value)}>
            <option value="">None</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Account</label>
            <select className="form-control" value={form.assigned_account_id} onChange={e => set('assigned_account_id', e.target.value)}>
              <option value="">None</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.login} ({a.platform})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Bundle</label>
            <select className="form-control" value={form.assigned_bundle_id} onChange={e => set('assigned_bundle_id', e.target.value)}>
              <option value="">None</option>
              {bundles.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input className="form-control" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">End Date</label>
            <input className="form-control" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-control" value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
        {err && <div className="error-msg">{err}</div>}
      </form>
    </Modal>
  );
}

export default function Experiments() {
  const { user }  = useAuth();
  const isAdmin   = user?.role === 'admin';
  const [exps, setExps]             = useState([]);
  const [hypotheses, setHypotheses] = useState([]);
  const [workers, setWorkers]       = useState([]);
  const [accounts, setAccounts]     = useState([]);
  const [bundles, setBundles]       = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterWorker, setFilterWorker] = useState('');
  const [filterBundle, setFilterBundle] = useState('');
  const [modal, setModal] = useState(null);

  function load() {
    api.get('/research/experiments' + (filterStatus ? `?status=${filterStatus}` : ''))
      .then(rows => {
        let filtered = rows;
        if (filterWorker) filtered = filtered.filter(e => e.assigned_worker_id === filterWorker);
        if (filterBundle) filtered = filtered.filter(e => e.assigned_bundle_id  === filterBundle);
        setExps(filtered);
      })
      .catch(console.error);
  }

  useEffect(load, [filterStatus, filterWorker, filterBundle]);
  useEffect(() => {
    api.get('/research/hypotheses').then(setHypotheses);
    api.get('/users').then(u => setWorkers(u.filter(x => x.role === 'worker')));
    api.get('/accounts').then(setAccounts);
    api.get('/bundles').then(setBundles);
  }, []);

  async function quickStatus(exp, status) {
    await api.put(`/research/experiments/${exp.id}`, { status });
    load();
  }

  async function del(id) {
    if (!confirm('Delete this experiment?')) return;
    await api.delete(`/research/experiments/${id}`);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Experiments</h1>
        {isAdmin && <button className="btn btn-primary" onClick={() => setModal('create')}>+ New Experiment</button>}
      </div>

      <div className="filter-bar">
        <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="form-control" value={filterWorker} onChange={e => setFilterWorker(e.target.value)}>
          <option value="">All Workers</option>
          {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select className="form-control" value={filterBundle} onChange={e => setFilterBundle(e.target.value)}>
          <option value="">All Bundles</option>
          {bundles.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className="card">
        {/* Desktop table */}
        <div className="table-wrap hide-mobile">
          <table>
            <thead>
              <tr><th>Hypothesis</th><th>Worker</th><th>Account</th><th>Bundle</th><th>Start</th><th>End</th><th>Status</th>{isAdmin && <th></th>}</tr>
            </thead>
            <tbody>
              {exps.length === 0 && <tr><td colSpan={8} className="empty">No experiments yet</td></tr>}
              {exps.map(e => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.hypothesis_title}</td>
                  <td className="text-muted">{e.worker_name || '—'}</td>
                  <td className="text-muted">{e.account_login ? `${e.account_login} (${e.platform})` : '—'}</td>
                  <td className="text-muted">{e.bundle_name || '—'}</td>
                  <td className="text-muted">{e.start_date ? new Date(e.start_date).toLocaleDateString() : '—'}</td>
                  <td className="text-muted">{e.end_date   ? new Date(e.end_date).toLocaleDateString()   : '—'}</td>
                  <td>
                    {isAdmin ? (
                      <select className="form-control" style={{ padding: '3px 6px', width: 'auto', fontSize: 12 }}
                        value={e.status} onChange={ev => quickStatus(e, ev.target.value)}>
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className={`badge badge-${e.status === 'active' ? 'testing' : 'active'}`}>{e.status}</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td><div className="td-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => setModal(e)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => del(e.id)}>Del</button>
                    </div></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-cards">
          {exps.length === 0 && <div className="empty">No experiments yet</div>}
          {exps.map(e => (
            <div className="mc-card" key={e.id}>
              <div className="mc-head">
                <div className="mc-head-info">
                  <div className="mc-title" style={{ whiteSpace: 'normal', WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 14 }}>
                    {e.hypothesis_title}
                  </div>
                  <div className="mc-badges" style={{ marginTop: 6 }}>
                    {!isAdmin && <span className={`badge badge-${e.status === 'active' ? 'testing' : 'active'}`}>{e.status}</span>}
                  </div>
                </div>
              </div>
              {isAdmin && (
                <div style={{ marginBottom: 10 }}>
                  <div className="mc-meta-label" style={{ marginBottom: 4 }}>Status</div>
                  <select className="mc-select" value={e.status} onChange={ev => quickStatus(e, ev.target.value)}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div className="mc-meta">
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Worker</div>
                  <div className="mc-meta-value">{e.worker_name || '—'}</div>
                </div>
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Bundle</div>
                  <div className="mc-meta-value">{e.bundle_name || '—'}</div>
                </div>
                <div className="mc-meta-item mc-meta-full">
                  <div className="mc-meta-label">Account</div>
                  <div className="mc-meta-value">{e.account_login ? `${e.account_login} (${e.platform})` : '—'}</div>
                </div>
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Start</div>
                  <div className="mc-meta-value">{e.start_date ? new Date(e.start_date).toLocaleDateString() : '—'}</div>
                </div>
                <div className="mc-meta-item">
                  <div className="mc-meta-label">End</div>
                  <div className="mc-meta-value">{e.end_date ? new Date(e.end_date).toLocaleDateString() : '—'}</div>
                </div>
              </div>
              {isAdmin && (
                <div className="mc-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => setModal(e)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => del(e.id)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <ExperimentModal
          exp={modal === 'create' ? null : modal}
          hypotheses={hypotheses} workers={workers}
          accounts={accounts} bundles={bundles}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
