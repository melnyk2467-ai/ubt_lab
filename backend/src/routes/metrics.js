const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const { video_id } = req.query;
  try {
    let q = `SELECT m.*, v.url as video_url FROM metrics m JOIN videos v ON v.id = m.video_id`;
    const vals = [];
    if (video_id) { q += ` WHERE m.video_id = $1`; vals.push(video_id); }
    q += ` ORDER BY m.collected_at DESC`;
    const { rows } = await db.query(q, vals);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { video_id, views = 0, likes = 0, comments = 0 } = req.body;
  if (!video_id) return res.status(400).json({ error: 'video_id required' });
  try {
    const { rows } = await db.query(
      'INSERT INTO metrics (video_id, views, likes, comments) VALUES ($1,$2,$3,$4) RETURNING *',
      [video_id, views, likes, comments]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM metrics WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { views, likes, comments } = req.body;
  try {
    const fields = []; const vals = []; let i = 1;
    if (views !== undefined) { fields.push(`views=$${i++}`); vals.push(views); }
    if (likes !== undefined) { fields.push(`likes=$${i++}`); vals.push(likes); }
    if (comments !== undefined) { fields.push(`comments=$${i++}`); vals.push(comments); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE metrics SET ${fields.join(', ')} WHERE id=$${i} RETURNING *`, vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM metrics WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
