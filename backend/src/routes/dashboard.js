const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const [
      totalVideos,
      videos10k,
      videos50k,
      topBundles,
      topWorkers,
    ] = await Promise.all([
      db.query('SELECT COUNT(*) FROM videos'),

      db.query(`
        SELECT COUNT(DISTINCT v.id) FROM videos v
        JOIN LATERAL (
          SELECT views FROM metrics WHERE video_id = v.id ORDER BY collected_at DESC LIMIT 1
        ) m ON true
        WHERE m.views >= 10000
      `),

      db.query(`
        SELECT COUNT(DISTINCT v.id) FROM videos v
        JOIN LATERAL (
          SELECT views FROM metrics WHERE video_id = v.id ORDER BY collected_at DESC LIMIT 1
        ) m ON true
        WHERE m.views >= 50000
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
        ORDER BY avg_views DESC
        LIMIT 10
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
        ORDER BY video_count DESC
        LIMIT 10
      `),
    ]);

    res.json({
      total_videos: parseInt(totalVideos.rows[0].count),
      videos_over_10k: parseInt(videos10k.rows[0].count),
      videos_over_50k: parseInt(videos50k.rows[0].count),
      top_bundles: topBundles.rows.map(r => ({
        ...r,
        avg_views: Math.round(parseFloat(r.avg_views)),
        max_views: parseInt(r.max_views),
        video_count: parseInt(r.video_count),
      })),
      top_workers: topWorkers.rows.map(r => ({
        ...r,
        video_count: parseInt(r.video_count),
        best_video_views: parseInt(r.best_video_views),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
