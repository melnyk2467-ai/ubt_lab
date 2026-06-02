/**
 * Assignment Center API  —  admin-only
 *
 * GET  /                              list all workers with assignment summary
 * GET  /:workerId                     worker detail + assigned resources + available pools
 * POST   /:workerId/accounts/:id      assign account to worker
 * DELETE /:workerId/accounts/:id      unassign account from worker
 * POST   /:workerId/tasks             create & assign a new task to worker
 * DELETE /:workerId/tasks/:id         delete a task (removing the assignment)
 * POST   /:workerId/experiments/:id   assign experiment to worker
 * DELETE /:workerId/experiments/:id   unassign experiment from worker
 */
const router = require('express').Router();
const db     = require('../db');
const { requireAdmin } = require('../middleware/auth');

// ── Worker list with full stats ───────────────────────────────────────────────
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        u.id, u.name, u.email, u.role, u.is_active, u.created_at,

        (SELECT COUNT(*) FROM accounts a
           WHERE a.user_id = u.id)::int                              AS accounts_count,

        (SELECT COUNT(*) FROM tasks t
           WHERE t.user_id = u.id
             AND t.status IN ('pending','in_progress'))::int         AS open_tasks_count,

        (SELECT COUNT(*) FROM tasks t
           WHERE t.user_id = u.id)::int                              AS total_tasks_count,

        (SELECT COUNT(*) FROM experiments e
           WHERE e.assigned_worker_id = u.id
             AND e.status = 'active')::int                           AS active_experiments_count,

        (SELECT COUNT(*) FROM videos v
           JOIN accounts a ON a.id = v.account_id
           WHERE a.user_id = u.id)::int                              AS videos_uploaded,

        COALESCE((
          SELECT SUM(m.views)
          FROM videos v
          JOIN accounts a ON a.id = v.account_id
          JOIN LATERAL (
            SELECT views FROM metrics WHERE video_id = v.id
            ORDER BY collected_at DESC LIMIT 1
          ) m ON true
          WHERE a.user_id = u.id
        ), 0)::int                                                   AS total_views

      FROM users u
      WHERE u.role = 'worker'
      ORDER BY u.name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Worker detail: assigned resources + available pools ───────────────────────
router.get('/:workerId', requireAdmin, async (req, res) => {
  const { workerId } = req.params;
  try {
    const [workerRes, accountsRes, tasksRes, experimentsRes, poolAccountsRes, poolExpsRes, bundlesRes] =
      await Promise.all([

        // Worker
        db.query(
          `SELECT id, name, email, role, is_active, created_at
           FROM users WHERE id = $1 AND role = 'worker'`,
          [workerId]
        ),

        // Assigned accounts
        db.query(
          `SELECT id, platform, login, status, created_at
           FROM accounts WHERE user_id = $1
           ORDER BY platform, login`,
          [workerId]
        ),

        // Assigned tasks
        db.query(
          `SELECT t.id, t.status, t.videos_required, t.created_at,
                  b.name AS bundle_name, b.id AS bundle_id
           FROM tasks t
           LEFT JOIN bundles b ON b.id = t.bundle_id
           WHERE t.user_id = $1
           ORDER BY t.created_at DESC`,
          [workerId]
        ),

        // Assigned experiments
        db.query(
          `SELECT e.id, e.status, e.start_date, e.end_date,
                  h.title  AS hypothesis_title,
                  b.name   AS bundle_name,
                  a.login  AS account_login, a.platform
           FROM experiments e
           JOIN hypotheses h ON h.id = e.hypothesis_id
           LEFT JOIN bundles  b ON b.id = e.assigned_bundle_id
           LEFT JOIN accounts a ON a.id = e.assigned_account_id
           WHERE e.assigned_worker_id = $1
           ORDER BY e.created_at DESC`,
          [workerId]
        ),

        // Available accounts (unassigned)
        db.query(
          `SELECT id, platform, login, status
           FROM accounts
           WHERE user_id IS NULL
           ORDER BY platform, login`
        ),

        // Available experiments (no worker assigned yet)
        db.query(
          `SELECT e.id, e.status,
                  h.title AS hypothesis_title,
                  b.name  AS bundle_name
           FROM experiments e
           JOIN hypotheses h ON h.id = e.hypothesis_id
           LEFT JOIN bundles b ON b.id = e.assigned_bundle_id
           WHERE e.assigned_worker_id IS NULL
           ORDER BY e.created_at DESC`
        ),

        // All bundles (for task creation)
        db.query(
          `SELECT b.id, b.name, o.name AS offer_name
           FROM bundles b JOIN offers o ON o.id = b.offer_id
           WHERE b.status != 'dead'
           ORDER BY b.name`
        ),
      ]);

    if (!workerRes.rows[0]) return res.status(404).json({ error: 'Worker not found' });

    res.json({
      worker:             workerRes.rows[0],
      accounts:           accountsRes.rows,
      tasks:              tasksRes.rows,
      experiments:        experimentsRes.rows,
      pool_accounts:      poolAccountsRes.rows,
      pool_experiments:   poolExpsRes.rows,
      bundles:            bundlesRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Assign account → worker ───────────────────────────────────────────────────
router.post('/:workerId/accounts/:accountId', requireAdmin, async (req, res) => {
  const { workerId, accountId } = req.params;
  try {
    const { rows } = await db.query(
      `UPDATE accounts SET user_id = $1
       WHERE id = $2
       RETURNING id, platform, login, status, created_at`,
      [workerId, accountId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Account not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Unassign account from worker ─────────────────────────────────────────────
router.delete('/:workerId/accounts/:accountId', requireAdmin, async (req, res) => {
  const { workerId, accountId } = req.params;
  try {
    const { rowCount } = await db.query(
      `UPDATE accounts SET user_id = NULL
       WHERE id = $1 AND user_id = $2`,
      [accountId, workerId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Account not assigned to this worker' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create & assign task to worker ────────────────────────────────────────────
router.post('/:workerId/tasks', requireAdmin, async (req, res) => {
  const { workerId } = req.params;
  const { bundle_id, videos_required = 1, status = 'pending' } = req.body;
  if (!bundle_id) return res.status(400).json({ error: 'bundle_id required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO tasks (user_id, bundle_id, videos_required, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [workerId, bundle_id, videos_required, status]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Delete task (removes assignment) ─────────────────────────────────────────
router.delete('/:workerId/tasks/:taskId', requireAdmin, async (req, res) => {
  const { workerId, taskId } = req.params;
  try {
    const { rowCount } = await db.query(
      `DELETE FROM tasks WHERE id = $1 AND user_id = $2`,
      [taskId, workerId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Task not found for this worker' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Assign experiment → worker ────────────────────────────────────────────────
router.post('/:workerId/experiments/:experimentId', requireAdmin, async (req, res) => {
  const { workerId, experimentId } = req.params;
  try {
    const { rows } = await db.query(
      `UPDATE experiments SET assigned_worker_id = $1
       WHERE id = $2
       RETURNING id, status`,
      [workerId, experimentId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Experiment not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Unassign experiment from worker ──────────────────────────────────────────
router.delete('/:workerId/experiments/:experimentId', requireAdmin, async (req, res) => {
  const { workerId, experimentId } = req.params;
  try {
    const { rowCount } = await db.query(
      `UPDATE experiments SET assigned_worker_id = NULL
       WHERE id = $1 AND assigned_worker_id = $2`,
      [experimentId, workerId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Experiment not assigned to this worker' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
