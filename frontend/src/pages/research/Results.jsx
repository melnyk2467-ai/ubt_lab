import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/Modal';

function fmt(n) {
  n = parseInt(n) || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
  return n;
}

function ResultModal({ result, experiments, onSave, onClose }) {
  const [form, setForm] = useState({
    experiment_id:    result?.experiment_id    || (experiments[0]?.id || ''),
    views:            result?.views            || 0,
    likes:            result?.likes            || 0,
    comments:         result?.comments         || 0,
    shares:           result?.shares           || 0,
    watch_time:       result?.watch_time       || 0,
    conversion_notes: result?.conversion_notes || '',
    conclusion:       result?.conclusion       || '',
  });
  const [err, setErr]     = useState('');
  const [saving, setSave] = useState(false);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function num(k, v) { set(k, parseInt(v) || 0); }

  async function submit(e) {
    e.preventDefault();
    setErr(''); setSave(true);
    try {
      if (result) await api.put(`/research/results/${result.id}`, form);
      else        await api.post('/research/results', form);
      onSave();
    } catch (ex) { setErr(ex.message); }
    finally { setSave(false); }
  }

  return (
    <Modal title={result ? 'Edit Result' : 'Record Result'} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
               <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Experiment</label>
          <select className="form-control" value={form.experiment_id} onChange={e => set('experiment_id', e.target.value)} required disabled={!!result}>
            <option value="">— Select —</option>
            {experiments.map(e => <option key={e.id} value={e.id}>{e.hypothesis_title}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Views</label>
            <input className="form-control" type="number" min="0" value={form.views} onChange={e => num('views', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Likes</label>
            <input className="form-control" type="number" min="0" value={form.likes} onChange={e => num('likes', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Comments</label>
            <input className="form-control" type="number" min="0" value={form.comments} onChange={e => num('comments', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Shares</label>
            <input className="form-control" type="number" min="0" value={form.shares} onChange={e => num('shares', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Watch Time (seconds)</label>
          <input className="form-control" type="number" min="0" value={form.watch_time} onChange={e => num('watch_time', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Conversion Notes</label>
          <textarea className="form-control" value={form.conversion_notes} onChange={e => set('conversion_notes', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Conclusion</label>
          <textarea className="form-control" value={form.conclusion} onChange={e => set('conclusion', e.target.value)}
            placeholder="Did the hypothesis hold? What did you learn?" />
        </div>
        {err && <div className="error-msg">{err}</div>}
      </form>
    </Modal>
  );
}

export default function Results() {
  const { user }  = useAuth();
  const isAdmin   = user?.role === 'admin';
  const [results, setResults]         = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [filterExp, setFilterExp]     = useState('');
  const [modal, setModal] = useState(null);

  function load() {
    const q = filterExp ? `?experiment_id=${filterExp}` : '';
    api.get(`/research/results${q}`).then(setResults).catch(console.error);
  }

  useEffect(load, [filterExp]);
  useEffect(() => { api.get('/research/experiments').then(setExperiments); }, []);

  async function del(id) {
    if (!confirm('Delete this result?')) return;
    await api.delete(`/research/results/${id}`);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Results</h1>
        {isAdmin && <button className="btn btn-primary" onClick={() => setModal('create')}>+ Record Result</button>}
      </div>

      <div className="filter-bar">
        <select className="form-control" value={filterExp} onChange={e => setFilterExp(e.target.value)}>
          <option value="">All Experiments</option>
          {experiments.map(e => <option key={e.id} value={e.id}>{e.hypothesis_title}</option>)}
        </select>
      </div>

      <div className="card">
        {/* Desktop table */}
        <div className="table-wrap hide-mobile">
          <table>
            <thead>
              <tr>
                <th>Hypothesis</th>
                <th className="text-right">Views</th><th className="text-right">Likes</th>
                <th className="text-right">Comments</th><th className="text-right">Shares</th>
                <th className="text-right">Watch Time</th><th>Conclusion</th><th>Date</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {results.length === 0 && <tr><td colSpan={9} className="empty">No results recorded yet</td></tr>}
              {results.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.hypothesis_title}</td>
                  <td className="text-right num" style={{ color: r.views >= 50000 ? 'var(--success)' : r.views >= 10000 ? 'var(--accent)' : 'inherit' }}>{fmt(r.views)}</td>
                  <td className="text-right num">{fmt(r.likes)}</td>
                  <td className="text-right num">{fmt(r.comments)}</td>
                  <td className="text-right num">{fmt(r.shares)}</td>
                  <td className="text-right num">{r.watch_time ? `${r.watch_time}s` : '—'}</td>
                  <td className="text-muted" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.conclusion || '—'}</td>
                  <td className="text-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                  {isAdmin && (
                    <td><div className="td-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => setModal(r)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => del(r.id)}>Del</button>
                    </div></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-cards">
          {results.length === 0 && <div className="empty">No results recorded yet</div>}
          {results.map(r => {
            const viewColor = r.views >= 50000 ? 'var(--success)' : r.views >= 10000 ? 'var(--accent)' : 'var(--text)';
            return (
              <div className="mc-card" key={r.id}>
                <div className="mc-head">
                  <div className="mc-head-info">
                    <div className="mc-title" style={{ whiteSpace: 'normal', WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 14 }}>
                      {r.hypothesis_title}
                    </div>
                  </div>
                </div>
                <div className="mc-stats">
                  <div className="mc-stat">
                    <div className="mc-stat-value" style={{ color: viewColor }}>{fmt(r.views)}</div>
                    <div className="mc-stat-label">Views</div>
                  </div>
                  <div className="mc-stat">
                    <div className="mc-stat-value">{fmt(r.likes)}</div>
                    <div className="mc-stat-label">Likes</div>
                  </div>
                  <div className="mc-stat">
                    <div className="mc-stat-value">{fmt(r.comments)}</div>
                    <div className="mc-stat-label">Cmnts</div>
                  </div>
                  <div className="mc-stat">
                    <div className="mc-stat-value">{fmt(r.shares)}</div>
                    <div className="mc-stat-label">Shares</div>
                  </div>
                </div>
                <div className="mc-meta">
                  {r.watch_time > 0 && (
                    <div className="mc-meta-item">
                      <div className="mc-meta-label">Watch Time</div>
                      <div className="mc-meta-value">{r.watch_time}s</div>
                    </div>
                  )}
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Date</div>
                    <div className="mc-meta-value">{new Date(r.created_at).toLocaleDateString()}</div>
                  </div>
                  {r.conclusion && (
                    <div className="mc-meta-item mc-meta-full">
                      <div className="mc-meta-label">Conclusion</div>
                      <div className="mc-meta-value" style={{ whiteSpace: 'normal', WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.conclusion}</div>
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <div className="mc-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setModal(r)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => del(r.id)}>Delete</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {modal && (
        <ResultModal
          result={modal === 'create' ? null : modal}
          experiments={experiments}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
