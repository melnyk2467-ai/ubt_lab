import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { CheckCircle, XCircle, ArrowLeft, ExternalLink } from 'lucide-react';

function fmt(n) {
  n = parseInt(n) || 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

const STATUS_BADGE = { pending_review: 'pending', approved: 'active', rejected: 'banned' };
const STATUS_LABEL = { pending_review: 'Pending Review', approved: 'Approved', rejected: 'Rejected' };

function MetricTile({ label, value, color }) {
  return (
    <div style={{
      flex: 1, minWidth: 80, textAlign: 'center',
      padding: '12px 8px', background: 'var(--surface-2)',
      borderRadius: 'var(--radius)',
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-light)', flexWrap: 'wrap' }}>
      <div style={{ width: 130, flexShrink: 0, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', paddingTop: 1 }}>
        {label}
      </div>
      <div style={{ flex: 1, fontSize: 13.5, color: 'var(--text-soft)' }}>{value}</div>
    </div>
  );
}

export default function ResultUploadDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const isAdmin   = user?.role === 'admin';

  const [upload, setUpload]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // review form
  const [comment, setComment] = useState('');
  const [acting,  setActing]  = useState(null); // 'approve' | 'reject'

  function load() {
    setLoading(true);
    api.get(`/result-uploads/${id}`)
      .then(setUpload)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  async function review(action) {
    setActing(action);
    setError('');
    try {
      await api.post(`/result-uploads/${id}/${action}`, { admin_comment: comment.trim() || undefined });
      load();
    } catch (e) { setError(e.message); }
    finally { setActing(null); }
  }

  if (loading && !upload) return <div className="text-muted" style={{ padding: 40 }}>Loading…</div>;
  if (error && !upload)   return <div className="error-msg" style={{ margin: 24 }}>{error}</div>;
  if (!upload) return null;

  const u = upload;
  const isPending = u.status === 'pending_review';
  const viewColor = u.views >= 50000 ? 'var(--success)' : u.views >= 10000 ? 'var(--accent)' : 'var(--text)';

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }}
        onClick={() => navigate('/result-uploads')}>
        <ArrowLeft size={14} strokeWidth={2} /> Back
      </button>

      {/* ── Status bar ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 18px', marginBottom: 20,
        background: u.status === 'approved' ? 'var(--success-dim)' :
                    u.status === 'rejected' ? 'var(--danger-dim)' : 'var(--warning-dim)',
        border: `1px solid ${u.status === 'approved' ? 'rgba(62,207,142,0.25)' :
                              u.status === 'rejected' ? 'rgba(224,86,86,0.25)' : 'rgba(245,166,35,0.25)'}`,
        borderRadius: 'var(--radius-lg)', flexWrap: 'wrap',
      }}>
        <span className={`badge badge-${STATUS_BADGE[u.status]}`} style={{ fontSize: 12 }}>
          {STATUS_LABEL[u.status]}
        </span>
        {u.reviewed_at && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Reviewed {new Date(u.reviewed_at).toLocaleDateString()}
            {u.reviewer_name && ` by ${u.reviewer_name}`}
          </span>
        )}
        {u.admin_comment && (
          <span style={{ fontSize: 13, color: 'var(--text-soft)', fontStyle: 'italic' }}>
            "{u.admin_comment}"
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>

        {/* ── Video + Metrics ─────────────────────────────────────────── */}
        <div className="card">
          <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 15 }}>Video Result</div>

          {/* URL */}
          <a href={u.video_url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16,
                     padding: '10px 14px', background: 'var(--surface-2)',
                     borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500,
                     color: 'var(--accent)', textDecoration: 'none',
                     overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <ExternalLink size={14} strokeWidth={1.75} style={{ flexShrink: 0 }} />
            {u.video_url}
          </a>

          {/* Metrics row */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: u.watch_time > 0 ? 16 : 0 }}>
            <MetricTile label="Views"    value={fmt(u.views)}    color={viewColor} />
            <MetricTile label="Likes"    value={fmt(u.likes)} />
            <MetricTile label="Comments" value={fmt(u.comments)} />
            <MetricTile label="Shares"   value={fmt(u.shares)} />
          </div>
          {u.watch_time > 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
              Watch time: <strong style={{ color: 'var(--text-soft)' }}>{u.watch_time}s</strong>
            </div>
          )}
        </div>

        {/* ── Context chain ────────────────────────────────────────────── */}
        <div className="card">
          <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 15 }}>Context Chain</div>
          <InfoRow label="Worker"     value={u.worker_name} />
          <InfoRow label="Bundle"     value={u.bundle_name} />
          <InfoRow label="Offer"      value={u.offer_name} />
          <InfoRow label="Hypothesis" value={u.hypothesis_title} />
          <InfoRow label="Pattern"    value={u.pattern_title} />
          <InfoRow label="Task Status" value={u.task_id ? u.task_status : null} />
          <InfoRow label="Exp. Status" value={u.experiment_id ? u.experiment_status : null} />
          <InfoRow label="Submitted"   value={new Date(u.created_at).toLocaleString()} />
          {u.notes && <InfoRow label="Notes" value={u.notes} />}
        </div>

        {/* ── Screenshot ──────────────────────────────────────────────── */}
        {u.screenshot_url && (
          <div className="card">
            <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 15 }}>Screenshot</div>
            <img
              src={u.screenshot_url}
              alt="Result screenshot"
              style={{ maxWidth: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
            <a href={u.screenshot_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', marginTop: 8, fontSize: 12, color: 'var(--accent)' }}>
              Open full size ↗
            </a>
          </div>
        )}

        {/* ── Admin review panel ───────────────────────────────────────── */}
        {isAdmin && isPending && (
          <div className="card">
            <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 15 }}>Review</div>
            <div className="form-group">
              <label className="form-label">Comment (optional)</label>
              <textarea className="form-control" rows={3}
                value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Leave feedback for the worker…" />
            </div>
            {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-danger" style={{ flex: 1, gap: 6 }}
                disabled={!!acting} onClick={() => review('reject')}>
                <XCircle size={14} strokeWidth={2} />
                {acting === 'reject' ? 'Rejecting…' : 'Reject'}
              </button>
              <button className="btn btn-primary" style={{ flex: 1, gap: 6 }}
                disabled={!!acting} onClick={() => review('approve')}>
                <CheckCircle size={14} strokeWidth={2} />
                {acting === 'approve' ? 'Approving…' : 'Approve'}
              </button>
            </div>
            <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Approving creates a video + metrics record and makes this result visible in dashboards.
            </p>
          </div>
        )}

        {/* Reviewed already — show outcome */}
        {isAdmin && !isPending && (
          <div className="card">
            <div style={{ marginBottom: 10, fontWeight: 700, fontSize: 15 }}>Review outcome</div>
            <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>
              {u.status === 'approved'
                ? 'This result was approved. A video and metrics record were created automatically.'
                : 'This result was rejected. The worker was notified via the status badge.'}
            </p>
            {u.admin_comment && (
              <div style={{ marginTop: 10, padding: '10px 14px', background: 'var(--surface-2)',
                borderRadius: 'var(--radius)', fontSize: 13, fontStyle: 'italic', color: 'var(--text-soft)' }}>
                "{u.admin_comment}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
