/**
 * GET /api/workspace
 * Returns the logged-in user's own scoped data — used by the Worker Dashboard.
 * Works for any authenticated role; data is always scoped to req.user.id.
 */
const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const uid = req.user.id;
  try {
    const [
      statsRes,
      accountsRes,
      openTasksRes,
      activeExpsRes,
      recentVideosRes,
    ] = await Promise.all([

      // Summary stats
      db.query(`
        SELECT
          (SELECT COUNT(*)  FROM accounts    WHERE user_id = $1)::int          AS accounts_count,
          (SELECT COUNT(*)  FROM tasks       WHERE user_id = $1
             AND status IN ('pending','in_progress'))::int                     AS open_tasks_count,
          (SELECT COUNT(*)  FROM experiments WHERE assigned_worker_id = $1
             AND status = 'active')::int                                       AS active_experiments_count,
          (SELECT COUNT(DISTINCT v.id) FROM videos v
             JOIN accounts a ON a.id = v.account_id
             WHERE a.user_id = $1)::int                                        AS total_videos,
          COALESCE((
            SELECT SUM(m.views) FROM videos v
            JOIN accounts a ON a.id = v.account_id
            JOIN LATERAL (SELECT views FROM metrics WHERE video_id = v.id
                          ORDER BY collected_at DESC LIMIT 1) m ON true
            WHERE a.user_id = $1
          ), 0)::int                                                           AS total_views,
          COALESCE((
            SELECT MAX(m.views) FROM videos v
            JOIN accounts a ON a.id = v.account_id
            JOIN LATERAL (SELECT views FROM metrics WHERE video_id = v.id
                          ORDER BY collected_at DESC LIMIT 1) m ON true
            WHERE a.user_id = $1
          ), 0)::int                                                           AS best_video_views
      `, [uid]),

      // Assigned accounts
      db.query(
        `SELECT id, platform, login, status, created_at
         FROM accounts WHERE user_id = $1 ORDER BY created_at DESC`,
        [uid]
      ),

      // Open tasks
      db.query(
        `SELECT t.id, t.status, t.videos_required, t.created_at, b.name AS bundle_name
         FROM tasks t LEFT JOIN bundles b ON b.id = t.bundle_id
         WHERE t.user_id = $1 AND t.status IN ('pending','in_progress')
         ORDER BY t.created_at DESC`,
        [uid]
      ),

      // Active experiments
      db.query(
        `SELECT e.id, e.status, e.start_date, e.end_date, e.notes,
                h.title  AS hypothesis_title,
                a.login  AS account_login, a.platform,
                b.name   AS bundle_name
         FROM experiments e
         JOIN hypotheses h ON h.id = e.hypothesis_id
         LEFT JOIN accounts a ON a.id = e.assigned_account_id
         LEFT JOIN bundles  b ON b.id = e.assigned_bundle_id
         WHERE e.assigned_worker_id = $1 AND e.status = 'active'
         ORDER BY e.created_at DESC`,
        [uid]
      ),

      // Recent videos (last 15) with latest metrics
      db.query(
        `SELECT v.id, v.url, v.posted_at, v.created_at,
                a.platform, a.login AS account_login,
                b.name   AS bundle_name,
                COALESCE(m.views,    0) AS latest_views,
                COALESCE(m.likes,    0) AS latest_likes,
                COALESCE(m.comments, 0) AS latest_comments
         FROM videos v
         JOIN accounts a ON a.id = v.account_id
         JOIN bundles  b ON b.id = v.bundle_id
         LEFT JOIN LATERAL (
           SELECT views, likes, comments FROM metrics
           WHERE video_id = v.id ORDER BY collected_at DESC LIMIT 1
         ) m ON true
         WHERE a.user_id = $1
         ORDER BY v.created_at DESC LIMIT 15`,
        [uid]
      ),
    ]);

    res.json({
      stats:               statsRes.rows[0],
      accounts:            accountsRes.rows,
      open_tasks:          openTasksRes.rows,
      active_experiments:  activeExpsRes.rows,
      recent_videos:       recentVideosRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
