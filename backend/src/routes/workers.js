const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// List all workers with quick assignment stats
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        u.id, u.name, u.email, u.role, u.is_active, u.created_at,
        (SELECT COUNT(*) FROM accounts a
           WHERE a.user_id = u.id)::int                              AS accounts_count,
        (SELECT COUNT(*) FROM tasks t
           WHERE t.user_id = u.id
             AND t.status IN ('pending','in_progress'))::int         AS open_tasks_count,
        (SELECT COUNT(*) FROM experiments e
           WHERE e.assigned_worker_id = u.id
             AND e.status = 'active')::int                           AS active_experiments_count,
        (SELECT COUNT(*) FROM videos v
           JOIN accounts a ON a.id = v.account_id
           WHERE a.user_id = u.id)::int                              AS videos_uploaded
      FROM users u
      WHERE u.role = 'worker'
      ORDER BY u.name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Full worker profile — worker info + all assignments + recent videos + metrics
router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const [workerRes, accountsRes, tasksRes, experimentsRes, videosRes, metricsRes] =
      await Promise.all([

        db.query(
          `SELECT id, name, email, role, is_active, created_at
           FROM users WHERE id = $1 AND role = 'worker'`,
          [id]
        ),

        db.query(
          `SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at DESC`,
          [id]
        ),

        db.query(
          `SELECT t.*, b.name AS bundle_name
           FROM tasks t
           LEFT JOIN bundles b ON b.id = t.bundle_id
           WHERE t.user_id = $1
           ORDER BY t.created_at DESC`,
          [id]
        ),

        db.query(
          `SELECT e.*,
                  h.title  AS hypothesis_title,
                  b.name   AS bundle_name,
                  a.login  AS account_login, a.platform
           FROM experiments e
           JOIN hypotheses h ON h.id = e.hypothesis_id
           LEFT JOIN bundles  b ON b.id = e.assigned_bundle_id
           LEFT JOIN accounts a ON a.id = e.assigned_account_id
           WHERE e.assigned_worker_id = $1
           ORDER BY e.created_at DESC`,
          [id]
        ),

        db.query(
          `SELECT v.id, v.url, v.posted_at, v.created_at,
                  b.name   AS bundle_name,
                  a.platform, a.login AS account_login,
                  COALESCE(m.views,    0) AS latest_views,
                  COALESCE(m.likes,    0) AS latest_likes,
                  COALESCE(m.comments, 0) AS latest_comments
           FROM videos v
           JOIN accounts a ON a.id = v.account_id
           JOIN bundles  b ON b.id = v.bundle_id
           LEFT JOIN LATERAL (
             SELECT views, likes, comments
             FROM metrics WHERE video_id = v.id
             ORDER BY collected_at DESC LIMIT 1
           ) m ON true
           WHERE a.user_id = $1
           ORDER BY v.created_at DESC
           LIMIT 20`,
          [id]
        ),

        db.query(
          `SELECT
             COUNT(DISTINCT v.id)::int                AS total_videos,
             COALESCE(SUM(m.views),  0)::int          AS total_views,
             COALESCE(MAX(m.views),  0)::int          AS best_video_views,
             ROUND(COALESCE(AVG(m.views), 0))::int    AS avg_views
           FROM videos v
           JOIN accounts a ON a.id = v.account_id
           LEFT JOIN LATERAL (
             SELECT views FROM metrics WHERE video_id = v.id
             ORDER BY collected_at DESC LIMIT 1
           ) m ON true
           WHERE a.user_id = $1`,
          [id]
        ),
      ]);

    if (!workerRes.rows[0]) return res.status(404).json({ error: 'Worker not found' });

    res.json({
      worker:          workerRes.rows[0],
      accounts:        accountsRes.rows,
      tasks:           tasksRes.rows,
      experiments:     experimentsRes.rows,
      videos:          videosRes.rows,
      metrics_summary: metricsRes.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
