/**
 * Result Upload Center API
 *
 * GET  /context          worker: tasks + experiments + accounts for form
 * GET  /                 list (admin: all filtered; worker: own)
 * POST /                 submit new upload (worker)
 * GET  /:id              single detail
 * POST /:id/approve      admin: approve + materialise video + metric
 * POST /:id/reject       admin: reject with optional comment
 */
const router = require('express').Router();
const db     = require('../db');
const { requireAuth } = require('../middleware/auth');

const isAdmin = r => r.user.role === 'admin';

// ── Upload context (worker's open tasks, active experiments, accounts) ────────
router.get('/context', requireAuth, async (req, res) => {
  const uid = req.user.id;
  try {
    const [tasksRes, expsRes, accountsRes] = await Promise.all([

      db.query(`
        SELECT t.id, t.status, t.videos_required,
               b.id AS bundle_id, b.name AS bundle_name,
               o.name AS offer_name
        FROM tasks t
        JOIN bundles b ON b.id = t.bundle_id
        JOIN offers  o ON o.id = b.offer_id
        WHERE t.user_id = $1 AND t.status IN ('pending','in_progress')
        ORDER BY t.created_at DESC
      `, [uid]),

      db.query(`
        SELECT e.id, e.status, e.start_date, e.end_date,
               h.id    AS hypothesis_id,
               h.title AS hypothesis_title,
               b.id    AS bundle_id, b.name AS bundle_name,
               a.id    AS account_id,
               a.login AS account_login, a.platform
        FROM experiments e
        JOIN hypotheses h ON h.id = e.hypothesis_id
        LEFT JOIN bundles  b ON b.id = e.assigned_bundle_id
        LEFT JOIN accounts a ON a.id = e.assigned_account_id
        WHERE e.assigned_worker_id = $1 AND e.status = 'active'
        ORDER BY e.created_at DESC
      `, [uid]),

      db.query(`
        SELECT id, platform, login, status
        FROM accounts WHERE user_id = $1 AND status != 'banned'
        ORDER BY platform, login
      `, [uid]),
    ]);

    res.json({
      tasks:    tasksRes.rows,
      experiments: expsRes.rows,
      accounts: accountsRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── List uploads ──────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const { worker_id, bundle_id, experiment_id, status, date_from, date_to } = req.query;
  try {
    const conds = []; const vals = []; let i = 1;

    if (!isAdmin(req)) {
      conds.push(`ru.worker_id = $${i++}`);
      vals.push(req.user.id);
    } else {
      if (worker_id)     { conds.push(`ru.worker_id     = $${i++}`); vals.push(worker_id); }
      if (bundle_id)     { conds.push(`ru.bundle_id     = $${i++}`); vals.push(bundle_id); }
      if (experiment_id) { conds.push(`ru.experiment_id = $${i++}`); vals.push(experiment_id); }
      if (status)        { conds.push(`ru.status        = $${i++}`); vals.push(status); }
      if (date_from)     { conds.push(`ru.created_at   >= $${i++}`); vals.push(date_from); }
      if (date_to)       { conds.push(`ru.created_at   <= $${i++}`); vals.push(date_to + 'T23:59:59Z'); }
    }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const { rows } = await db.query(`
      SELECT
        ru.id, ru.status, ru.video_url, ru.views, ru.likes, ru.comments,
        ru.shares, ru.watch_time, ru.notes, ru.screenshot_url,
        ru.admin_comment, ru.reviewed_at, ru.created_at,
        u.name  AS worker_name,
        b.name  AS bundle_name,
        h.title AS hypothesis_title,
        e.id    AS experiment_id,
        t.id    AS task_id
      FROM result_uploads ru
      JOIN users u ON u.id = ru.worker_id
      LEFT JOIN bundles     b ON b.id = ru.bundle_id
      LEFT JOIN hypotheses  h ON h.id = ru.hypothesis_id
      LEFT JOIN experiments e ON e.id = ru.experiment_id
      LEFT JOIN tasks       t ON t.id = ru.task_id
      ${where}
      ORDER BY ru.created_at DESC
    `, vals);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Submit new upload ─────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const uid = req.user.id;
  const {
    task_id, experiment_id, account_id,
    video_url, views = 0, likes = 0, comments = 0, shares = 0, watch_time = 0,
    notes, screenshot_url,
  } = req.body;

  if (!video_url) return res.status(400).json({ error: 'video_url is required' });
  if (!task_id && !experiment_id)
    return res.status(400).json({ error: 'Provide task_id or experiment_id' });

  try {
    // ── Resolve auto-links ──────────────────────────────────────────────────
    let bundle_id = null;
    let resolved_account_id = account_id || null;
    let hypothesis_id = null;

    if (task_id) {
      // Verify task belongs to this worker
      const { rows: trows } = await db.query(
        `SELECT t.id, t.bundle_id FROM tasks t
         WHERE t.id = $1 AND t.user_id = $2`,
        [task_id, uid]
      );
      if (!trows[0]) return res.status(403).json({ error: 'Task not assigned to you' });
      bundle_id = trows[0].bundle_id;
    }

    if (experiment_id) {
      // Verify experiment belongs to this worker
      const { rows: erows } = await db.query(
        `SELECT e.id, e.assigned_bundle_id, e.assigned_account_id, e.hypothesis_id
         FROM experiments e
         WHERE e.id = $1 AND e.assigned_worker_id = $2`,
        [experiment_id, uid]
      );
      if (!erows[0]) return res.status(403).json({ error: 'Experiment not assigned to you' });
      bundle_id     = bundle_id     || erows[0].assigned_bundle_id;
      resolved_account_id = resolved_account_id || erows[0].assigned_account_id;
      hypothesis_id = erows[0].hypothesis_id;
    }

    const { rows } = await db.query(`
      INSERT INTO result_uploads
        (worker_id, task_id, experiment_id, bundle_id, account_id, hypothesis_id,
         video_url, views, likes, comments, shares, watch_time, notes, screenshot_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
    `, [uid, task_id || null, experiment_id || null, bundle_id, resolved_account_id,
        hypothesis_id, video_url, views, likes, comments, shares, watch_time,
        notes || null, screenshot_url || null]);

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Single detail ─────────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        ru.*,
        u.name  AS worker_name, u.email AS worker_email,
        b.name  AS bundle_name,
        o.name  AS offer_name,
        h.title AS hypothesis_title,
        p.title AS pattern_title,
        t.videos_required, t.status AS task_status,
        e.start_date, e.end_date, e.status AS experiment_status,
        rv.name AS reviewer_name
      FROM result_uploads ru
      JOIN users u ON u.id = ru.worker_id
      LEFT JOIN bundles    b  ON b.id  = ru.bundle_id
      LEFT JOIN offers     o  ON o.id  = b.offer_id
      LEFT JOIN hypotheses h  ON h.id  = ru.hypothesis_id
      LEFT JOIN patterns   p  ON p.id  = h.linked_pattern_id
      LEFT JOIN tasks      t  ON t.id  = ru.task_id
      LEFT JOIN experiments e ON e.id  = ru.experiment_id
      LEFT JOIN users      rv ON rv.id = ru.reviewed_by
      WHERE ru.id = $1
    `, [req.params.id]);

    if (!rows[0]) return res.status(404).json({ error: 'Not found' });

    // Workers may only see their own
    if (!isAdmin(req) && rows[0].worker_id !== req.user.id)
      return res.status(403).json({ error: 'Access denied' });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Approve ───────────────────────────────────────────────────────────────────
router.post('/:id/approve', requireAuth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  const { admin_comment } = req.body;

  try {
    const { rows } = await db.query(
      'SELECT * FROM result_uploads WHERE id = $1', [req.params.id]
    );
    const upload = rows[0];
    if (!upload) return res.status(404).json({ error: 'Not found' });
    if (upload.status !== 'pending_review')
      return res.status(400).json({ error: 'Already reviewed' });

    // Materialise video record
    let video_id = null;
    if (upload.account_id && upload.bundle_id) {
      const { rows: vrows } = await db.query(
        `INSERT INTO videos (account_id, bundle_id, url, posted_at)
         VALUES ($1, $2, $3, NOW()) RETURNING id`,
        [upload.account_id, upload.bundle_id, upload.video_url]
      );
      video_id = vrows[0].id;

      // Materialise metrics
      await db.query(
        `INSERT INTO metrics (video_id, views, likes, comments, shares, watch_time)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [video_id, upload.views, upload.likes, upload.comments,
         upload.shares, upload.watch_time]
      );
    }

    const { rows: updated } = await db.query(`
      UPDATE result_uploads
      SET status = 'approved', admin_comment = $1,
          reviewed_by = $2, reviewed_at = NOW(), video_id = $3
      WHERE id = $4 RETURNING *
    `, [admin_comment || null, req.user.id, video_id, req.params.id]);

    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reject ────────────────────────────────────────────────────────────────────
router.post('/:id/reject', requireAuth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  const { admin_comment } = req.body;

  try {
    const { rows } = await db.query(
      'SELECT status FROM result_uploads WHERE id = $1', [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    if (rows[0].status !== 'pending_review')
      return res.status(400).json({ error: 'Already reviewed' });

    const { rows: updated } = await db.query(`
      UPDATE result_uploads
      SET status = 'rejected', admin_comment = $1,
          reviewed_by = $2, reviewed_at = NOW()
      WHERE id = $3 RETURNING *
    `, [admin_comment || null, req.user.id, req.params.id]);

    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
