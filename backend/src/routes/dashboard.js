const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const [
      // ── Video stats ──────────────────────────────────────────────────────────
      totalVideos, videos10k, videos50k, topBundles, topWorkers,
      // ── Research Engine stats ────────────────────────────────────────────────
      totalIdeas, activeHypotheses, runningExperiments, totalWinners,
      funnelIdeas, funnelPatterns, funnelHypotheses, funnelExperiments, funnelWinners,
      // ── Team stats ───────────────────────────────────────────────────────────
      activeWorkers, assignedAccounts, openTasksCount, activeExperimentsCount,
      workerOverview,
    ] = await Promise.all([

      // ── Video stats ────────────────────────────────────────────────────────
      db.query('SELECT COUNT(*) FROM videos'),

      db.query(`
        SELECT COUNT(DISTINCT v.id) FROM videos v
        JOIN LATERAL (
          SELECT views FROM metrics WHERE video_id = v.id ORDER BY collected_at DESC LIMIT 1
        ) m ON true WHERE m.views >= 10000
      `),

      db.query(`
        SELECT COUNT(DISTINCT v.id) FROM videos v
        JOIN LATERAL (
          SELECT views FROM metrics WHERE video_id = v.id ORDER BY collected_at DESC LIMIT 1
        ) m ON true WHERE m.views >= 50000
      `),

      db.query(`
        SELECT b.id, b.name, b.status,
               COUNT(v.id) as video_count,
               COALESCE(AVG(m.views), 0) as avg_views,
               COALESCE(MAX(m.views), 0) as max_views
        FROM bundles b
        LEFT JOIN videos v ON v.bundle_id = b.id
        LEFT JOIN LATERAL (
          SELECT views FROM metrics WHERE video_id = v.id ORDER BY collected_at DESC LIMIT 1
        ) m ON true
        GROUP BY b.id, b.name, b.status
        ORDER BY avg_views DESC LIMIT 10
      `),

      db.query(`
        SELECT u.id, u.name,
               COUNT(v.id) as video_count,
               COALESCE(MAX(m.views), 0) as best_video_views
        FROM users u
        LEFT JOIN accounts a ON a.user_id = u.id
        LEFT JOIN videos v ON v.account_id = a.id
        LEFT JOIN LATERAL (
          SELECT views FROM metrics WHERE video_id = v.id ORDER BY collected_at DESC LIMIT 1
        ) m ON true
        WHERE u.role = 'worker'
        GROUP BY u.id, u.name
        ORDER BY video_count DESC LIMIT 10
      `),

      // ── Research Engine ────────────────────────────────────────────────────
      db.query(`SELECT COUNT(*) FROM ideas WHERE status != 'archived'`),
      db.query(`SELECT COUNT(*) FROM hypotheses WHERE status IN ('planned','testing')`),
      db.query(`SELECT COUNT(*) FROM experiments WHERE status = 'active'`),
      db.query(`SELECT COUNT(*) FROM winners`),
      db.query(`SELECT COUNT(*) FROM ideas`),
      db.query(`SELECT COUNT(*) FROM patterns`),
      db.query(`SELECT COUNT(*) FROM hypotheses`),
      db.query(`SELECT COUNT(*) FROM experiments`),
      db.query(`SELECT COUNT(*) FROM winners`),

      // ── Team stats ─────────────────────────────────────────────────────────
      db.query(`SELECT COUNT(*) FROM users WHERE role = 'worker' AND is_active = true`),
      db.query(`SELECT COUNT(*) FROM accounts WHERE user_id IS NOT NULL`),
      db.query(`SELECT COUNT(*) FROM tasks WHERE status IN ('pending','in_progress')`),
      db.query(`SELECT COUNT(*) FROM experiments WHERE status = 'active'`),

      // Worker Overview table
      db.query(`
        SELECT
          u.id, u.name,
          (SELECT COUNT(*) FROM accounts  a WHERE a.user_id = u.id)::int             AS accounts_assigned,
          (SELECT COUNT(*) FROM tasks     t WHERE t.user_id = u.id
             AND t.status IN ('pending','in_progress'))::int                         AS open_tasks,
          (SELECT COUNT(*) FROM videos    v
             JOIN accounts a ON a.id = v.account_id WHERE a.user_id = u.id)::int    AS videos_uploaded,
          (SELECT COUNT(*) FROM experiments e
             WHERE e.assigned_worker_id = u.id AND e.status = 'active')::int        AS active_experiments
        FROM users u
        WHERE u.role = 'worker' AND u.is_active = true
        ORDER BY open_tasks DESC, u.name
      `),
    ]);

    res.json({
      // Videos
      total_videos:    parseInt(totalVideos.rows[0].count),
      videos_over_10k: parseInt(videos10k.rows[0].count),
      videos_over_50k: parseInt(videos50k.rows[0].count),
      top_bundles: topBundles.rows.map(r => ({
        ...r,
        avg_views:   Math.round(parseFloat(r.avg_views)),
        max_views:   parseInt(r.max_views),
        video_count: parseInt(r.video_count),
      })),
      top_workers: topWorkers.rows.map(r => ({
        ...r,
        video_count:      parseInt(r.video_count),
        best_video_views: parseInt(r.best_video_views),
      })),

      // Research
      total_ideas:         parseInt(totalIdeas.rows[0].count),
      active_hypotheses:   parseInt(activeHypotheses.rows[0].count),
      running_experiments: parseInt(runningExperiments.rows[0].count),
      total_winners:       parseInt(totalWinners.rows[0].count),
      funnel: {
        ideas:       parseInt(funnelIdeas.rows[0].count),
        patterns:    parseInt(funnelPatterns.rows[0].count),
        hypotheses:  parseInt(funnelHypotheses.rows[0].count),
        experiments: parseInt(funnelExperiments.rows[0].count),
        winners:     parseInt(funnelWinners.rows[0].count),
      },

      // Team
      active_workers:           parseInt(activeWorkers.rows[0].count),
      assigned_accounts:        parseInt(assignedAccounts.rows[0].count),
      open_tasks_count:         parseInt(openTasksCount.rows[0].count),
      active_experiments_count: parseInt(activeExperimentsCount.rows[0].count),
      worker_overview:          workerOverview.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
