import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/Modal';

function PatternModal({ pattern, ideas, onSave, onClose }) {
  const [form, setForm] = useState({
    title:            pattern?.title            || '',
    description:      pattern?.description      || '',
    confidence_score: pattern?.confidence_score || 5,
    idea_ids:         pattern?.linked_ideas?.map(i => i.id) || [],
  });
  const [err, setErr]     = useState('');
  const [saving, setSave] = useState(false);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function toggleIdea(id) {
    setForm(f => ({
      ...f,
      idea_ids: f.idea_ids.includes(id) ? f.idea_ids.filter(x => x !== id) : [...f.idea_ids, id],
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setErr(''); setSave(true);
    try {
      if (pattern) await api.put(`/research/patterns/${pattern.id}`, form);
      else         await api.post('/research/patterns', form);
      onSave();
    } catch (ex) { setErr(ex.message); }
    finally { setSave(false); }
  }

  return (
    <Modal title={pattern ? 'Edit Pattern' : 'New Pattern'} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
               <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Pattern Name</label>
          <input className="form-control" value={form.title} onChange={e => set('title', e.target.value)} required autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-control" value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Confidence Score: <strong>{form.confidence_score}</strong>/10</label>
          <input type="range" min="1" max="10" value={form.confidence_score}
            onChange={e => set('confidence_score', parseInt(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            <span>1 — Low</span><span>10 — High</span>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Linked Ideas ({form.idea_ids.length} selected)</label>
          <div style={{ maxHeight: 160, overflowY: 'auto', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 8px', background: 'var(--bg)' }}>
            {ideas.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No ideas available</div>}
            {ideas.map(idea => (
              <label key={idea.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={form.idea_ids.includes(idea.id)} onChange={() => toggleIdea(idea.id)}
                  style={{ accentColor: 'var(--accent)' }} />
                {idea.title}
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{idea.status}</span>
              </label>
            ))}
          </div>
        </div>
        {err && <div className="error-msg">{err}</div>}
      </form>
    </Modal>
  );
}

function ConfidenceDots({ score }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i < score ? 'var(--accent)' : 'var(--border)', flexShrink: 0 }} />
      ))}
      <span style={{ marginLeft: 4, fontSize: 12, color: 'var(--text-muted)' }}>{score}/10</span>
    </div>
  );
}

export default function Patterns() {
  const { user }  = useAuth();
  const isAdmin   = user?.role === 'admin';
  const [patterns, setPatterns] = useState([]);
  const [ideas, setIdeas]       = useState([]);
  const [modal, setModal]       = useState(null);

  function load() { api.get('/research/patterns').then(setPatterns).catch(console.error); }

  useEffect(() => { load(); api.get('/research/ideas').then(setIdeas); }, []);

  async function del(id) {
    if (!confirm('Delete this pattern?')) return;
    await api.delete(`/research/patterns/${id}`);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Patterns</h1>
        {isAdmin && <button className="btn btn-primary" onClick={() => setModal('create')}>+ New Pattern</button>}
      </div>

      <div className="card">
        {/* Desktop table */}
        <div className="table-wrap hide-mobile">
          <table>
            <thead>
              <tr><th>Name</th><th>Description</th><th>Confidence</th><th>Linked Ideas</th><th>Creator</th><th>Created</th>{isAdmin && <th></th>}</tr>
            </thead>
            <tbody>
              {patterns.length === 0 && <tr><td colSpan={7} className="empty">No patterns yet</td></tr>}
              {patterns.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.title}</td>
                  <td className="text-muted" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description || '—'}</td>
                  <td><ConfidenceDots score={p.confidence_score} /></td>
                  <td>
                    {p.idea_count > 0 ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(p.linked_ideas || []).slice(0, 3).map(i => (
                          <span key={i.id} className="badge badge-pending" style={{ fontSize: 10 }}>{i.title}</span>
                        ))}
                        {p.idea_count > 3 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{p.idea_count - 3}</span>}
                      </div>
                    ) : <span className="text-muted">None</span>}
                  </td>
                  <td className="text-muted">{p.creator_name}</td>
                  <td className="text-muted">{new Date(p.created_at).toLocaleDateString()}</td>
                  {isAdmin && (
                    <td><div className="td-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => setModal(p)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => del(p.id)}>Del</button>
                    </div></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-cards">
          {patterns.length === 0 && <div className="empty">No patterns yet</div>}
          {patterns.map(p => (
            <div className="mc-card" key={p.id}>
              <div className="mc-head">
                <div className="mc-head-info">
                  <div className="mc-title">{p.title}</div>
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div className="mc-meta-label" style={{ marginBottom: 5 }}>Confidence</div>
                <div className="mc-dots">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div key={i} className="mc-dot" style={{ background: i < p.confidence_score ? 'var(--accent)' : 'var(--border)' }} />
                  ))}
                  <span style={{ marginLeft: 4, fontSize: 12, color: 'var(--text-muted)' }}>{p.confidence_score}/10</span>
                </div>
              </div>
              <div className="mc-meta">
                {p.description && (
                  <div className="mc-meta-item mc-meta-full">
                    <div className="mc-meta-label">Description</div>
                    <div className="mc-meta-value" style={{ whiteSpace: 'normal', WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</div>
                  </div>
                )}
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Linked Ideas</div>
                  <div className="mc-meta-value">{p.idea_count > 0 ? `${p.idea_count} idea${p.idea_count !== 1 ? 's' : ''}` : 'None'}</div>
                </div>
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Creator</div>
                  <div className="mc-meta-value">{p.creator_name}</div>
                </div>
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Created</div>
                  <div className="mc-meta-value">{new Date(p.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              {p.idea_count > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                  {(p.linked_ideas || []).slice(0, 3).map(i => (
                    <span key={i.id} className="badge badge-pending" style={{ fontSize: 10 }}>{i.title}</span>
                  ))}
                  {p.idea_count > 3 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{p.idea_count - 3} more</span>}
                </div>
              )}
              {isAdmin && (
                <div className="mc-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => setModal(p)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => del(p.id)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <PatternModal
          pattern={modal === 'create' ? null : modal}
          ideas={ideas}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
