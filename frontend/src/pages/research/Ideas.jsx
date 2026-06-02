import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/Modal';

const STATUSES = ['new', 'reviewing', 'archived'];
const STATUS_BADGE = { new: 'pending', reviewing: 'testing', archived: 'dead' };

function IdeaModal({ idea, onSave, onClose }) {
  const [form, setForm] = useState({
    title:       idea?.title       || '',
    description: idea?.description || '',
    source:      idea?.source      || '',
    status:      idea?.status      || 'new',
  });
  const [err, setErr]   = useState('');
  const [saving, setSave] = useState(false);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setErr(''); setSave(true);
    try {
      if (idea) await api.put(`/research/ideas/${idea.id}`, form);
      else      await api.post('/research/ideas', form);
      onSave();
    } catch (ex) { setErr(ex.message); }
    finally { setSave(false); }
  }

  return (
    <Modal title={idea ? 'Edit Idea' : 'New Idea'} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
               <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Title</label>
          <input className="form-control" value={form.title} onChange={e => set('title', e.target.value)} required autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-control" value={form.description} onChange={e => set('description', e.target.value)} placeholder="What did you observe?" />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Source</label>
            <input className="form-control" value={form.source} onChange={e => set('source', e.target.value)} placeholder="TikTok, competitor, team…" />
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

export default function Ideas() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';
  const [ideas, setIdeas]   = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [query, setQuery]   = useState('');
  const [modal, setModal]   = useState(null);

  function load() {
    const p = new URLSearchParams();
    if (filter) p.set('status', filter);
    if (query)  p.set('search', query);
    const q = p.toString() ? '?' + p.toString() : '';
    api.get(`/research/ideas${q}`).then(setIdeas).catch(console.error);
  }

  useEffect(load, [filter, query]);

  async function quickStatus(idea, status) {
    await api.put(`/research/ideas/${idea.id}`, { status });
    load();
  }

  async function del(id) {
    if (!confirm('Delete this idea?')) return;
    await api.delete(`/research/ideas/${id}`);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Ideas</h1>
        {isAdmin && <button className="btn btn-primary" onClick={() => setModal('create')}>+ New Idea</button>}
      </div>

      <div className="filter-bar">
        <input className="form-control" placeholder="Search…" value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && setQuery(search)} />
        <button className="btn btn-secondary" onClick={() => setQuery(search)}>Search</button>
        <select className="form-control" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        {(query || filter) && (
          <button className="btn btn-ghost" onClick={() => { setSearch(''); setQuery(''); setFilter(''); }}>Clear</button>
        )}
      </div>

      <div className="card">
        {/* Desktop table */}
        <div className="table-wrap hide-mobile">
          <table>
            <thead>
              <tr><th>Title</th><th>Source</th><th>Description</th><th>Status</th><th>Creator</th><th>Created</th>{isAdmin && <th></th>}</tr>
            </thead>
            <tbody>
              {ideas.length === 0 && <tr><td colSpan={7} className="empty">No ideas yet — add the first one</td></tr>}
              {ideas.map(idea => (
                <tr key={idea.id}>
                  <td style={{ fontWeight: 600 }}>{idea.title}</td>
                  <td className="text-muted">{idea.source || '—'}</td>
                  <td className="text-muted" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{idea.description || '—'}</td>
                  <td>
                    {isAdmin ? (
                      <select className="form-control" style={{ padding: '3px 6px', width: 'auto', fontSize: 12 }}
                        value={idea.status} onChange={e => quickStatus(idea, e.target.value)}>
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className={`badge badge-${STATUS_BADGE[idea.status] || idea.status}`}>{idea.status}</span>
                    )}
                  </td>
                  <td className="text-muted">{idea.creator_name}</td>
                  <td className="text-muted">{new Date(idea.created_at).toLocaleDateString()}</td>
                  {isAdmin && (
                    <td><div className="td-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => setModal(idea)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => del(idea.id)}>Del</button>
                    </div></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-cards">
          {ideas.length === 0 && <div className="empty">No ideas yet — add the first one</div>}
          {ideas.map(idea => (
            <div className="mc-card" key={idea.id}>
              <div className="mc-head">
                <div className="mc-head-info">
                  <div className="mc-title">{idea.title}</div>
                  <div className="mc-badges">
                    {!isAdmin && <span className={`badge badge-${STATUS_BADGE[idea.status] || idea.status}`}>{idea.status}</span>}
                  </div>
                </div>
              </div>
              {isAdmin && (
                <div style={{ marginBottom: 10 }}>
                  <div className="mc-meta-label" style={{ marginBottom: 4 }}>Status</div>
                  <select className="mc-select" value={idea.status} onChange={e => quickStatus(idea, e.target.value)}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div className="mc-meta">
                {idea.source && (
                  <div className="mc-meta-item">
                    <div className="mc-meta-label">Source</div>
                    <div className="mc-meta-value">{idea.source}</div>
                  </div>
                )}
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Creator</div>
                  <div className="mc-meta-value">{idea.creator_name}</div>
                </div>
                <div className="mc-meta-item">
                  <div className="mc-meta-label">Created</div>
                  <div className="mc-meta-value">{new Date(idea.created_at).toLocaleDateString()}</div>
                </div>
                {idea.description && (
                  <div className="mc-meta-item mc-meta-full">
                    <div className="mc-meta-label">Description</div>
                    <div className="mc-meta-value" style={{ whiteSpace: 'normal', WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{idea.description}</div>
                  </div>
                )}
              </div>
              {isAdmin && (
                <div className="mc-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => setModal(idea)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => del(idea.id)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <IdeaModal
          idea={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
