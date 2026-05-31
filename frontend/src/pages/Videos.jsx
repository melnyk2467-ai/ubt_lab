import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';

function fmt(n) {
  n = parseInt(n) || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n;
}

function VideoModal({ video, accounts, bundles, onSave, onClose }) {
  const [form, setForm] = useState({
    account_id: video?.account_id || (accounts[0]?.id || ''),
    bundle_id: video?.bundle_id || (bundles[0]?.id || ''),
    url: video?.url || '',
    description: video?.description || '',
    posted_at: video?.posted_at ? video.posted_at.slice(0, 10) : '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const body = { ...form, posted_at: form.posted_at || null };
      if (video) await api.put(`/videos/${video.id}`, body);
      else await api.post('/videos', body);
      onSave();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={video ? 'Edit Video' : 'Add Video'} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Video URL</label>
          <input className="form-control" value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://…" required />
        </div>
        <div className="form-group">
          <label className="form-label">Account</label>
          <select className="form-control" value={form.account_id} onChange={e => set('account_id', e.target.value)} required>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.user_name} — {a.platform} / {a.login}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Bundle</label>
          <select className="form-control" value={form.bundle_id} onChange={e => set('bundle_id', e.target.value)} required>
            {bundles.map(b => <option key={b.id} value={b.id}>{b.name} ({b.offer_name})</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Posted At</label>
            <input className="form-control" type="date" value={form.posted_at} onChange={e => set('posted_at', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-control" value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        {error && <div className="error-msg">{error}</div>}
      </form>
    </Modal>
  );
}

export default function Videos() {
  const [videos, setVideos] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [filterBundle, setFilterBundle] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [modal, setModal] = useState(null);

  function load() {
    const params = new URLSearchParams();
    if (filterBundle) params.set('bundle_id', filterBundle);
    if (filterAccount) params.set('account_id', filterAccount);
    const q = params.toString() ? '?' + params.toString() : '';
    api.get(`/videos${q}`).then(setVideos).catch(console.error);
  }

  useEffect(() => {
    api.get('/accounts').then(setAccounts);
    api.get('/bundles').then(setBundles);
  }, []);

  useEffect(load, [filterBundle, filterAccount]);

  async function del(id) {
    if (!confirm('Delete this video?')) return;
    await api.delete(`/videos/${id}`);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Videos</h1>
        <button className="btn btn-primary" onClick={() => setModal('create')}>+ Add Video</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select className="form-control" style={{ width: 220 }} value={filterBundle} onChange={e => setFilterBundle(e.target.value)}>
          <option value="">All Bundles</option>
          {bundles.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="form-control" style={{ width: 220 }} value={filterAccount} onChange={e => setFilterAccount(e.target.value)}>
          <option value="">All Accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.login} ({a.platform})</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>URL</th>
                <th>Worker</th>
                <th>Account</th>
                <th>Bundle</th>
                <th>Posted</th>
                <th className="text-right">Views</th>
                <th className="text-right">Likes</th>
                <th className="text-right">Comments</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {videos.length === 0 && <tr><td colSpan={9} className="empty">No videos yet</td></tr>}
              {videos.map(v => (
                <tr key={v.id}>
                  <td>
                    <a href={v.url} target="_blank" rel="noopener noreferrer"
                       style={{ maxWidth: 180, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.url}
                    </a>
                  </td>
                  <td>{v.worker_name}</td>
                  <td className="text-muted">{v.platform} / {v.account_login}</td>
                  <td>{v.bundle_name}</td>
                  <td className="text-muted">{v.posted_at ? new Date(v.posted_at).toLocaleDateString() : '—'}</td>
                  <td className="text-right num" style={{ color: parseInt(v.latest_views) >= 50000 ? 'var(--success)' : parseInt(v.latest_views) >= 10000 ? 'var(--accent)' : 'inherit' }}>
                    {fmt(v.latest_views)}
                  </td>
                  <td className="text-right num">{fmt(v.latest_likes)}</td>
                  <td className="text-right num">{fmt(v.latest_comments)}</td>
                  <td><div className="td-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setModal(v)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => del(v.id)}>Del</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <VideoModal
          video={modal === 'create' ? null : modal}
          accounts={accounts}
          bundles={bundles}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
