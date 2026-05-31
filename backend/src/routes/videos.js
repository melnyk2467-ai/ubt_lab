const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const { bundle_id, account_id } = req.query;
  try {
    let q = `SELECT v.*,
               a.login as account_login, a.platform,
               b.name as bundle_name,
               u.name as worker_name,
               COALESCE(m.views, 0) as latest_views,
               COALESCE(m.likes, 0) as latest_likes,
               COALESCE(m.comments, 0) as latest_comments
             FROM videos v
             JOIN accounts a ON a.id = v.account_id
             JOIN users u ON u.id = a.user_id
             JOIN bundles b ON b.id = v.bundle_id
             LEFT JOIN LATERAL (
               SELECT views, likes, comments FROM metrics
               WHERE video_id = v.id
               ORDER BY collected_at DESC LIMIT 1
             ) m ON true`;
    const conds = []; const vals = [];
    if (bundle_id) { conds.push(`v.bundle_id = $${vals.length + 1}`); vals.push(bundle_id); }
    if (account_id) { conds.push(`v.account_id = $${vals.length + 1}`); vals.push(account_id); }
    if (conds.length) q += ` WHERE ${conds.join(' AND ')}`;
    q += ` ORDER BY v.created_at DESC`;
    const { rows } = await db.query(q, vals);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { account_id, bundle_id, url, description, posted_at } = req.body;
  if (!account_id || !bundle_id || !url) return res.status(400).json({ error: 'account_id, bundle_id, url required' });
  try {
    const { rows } = await db.query(
      'INSERT INTO videos (account_id, bundle_id, url, description, posted_at) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [account_id, bundle_id, url, description, posted_at || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM videos WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { account_id, bundle_id, url, description, posted_at } = req.body;
  try {
    const fields = []; const vals = []; let i = 1;
    if (account_id !== undefined) { fields.push(`account_id=$${i++}`); vals.push(account_id); }
    if (bundle_id !== undefined) { fields.push(`bundle_id=$${i++}`); vals.push(bundle_id); }
    if (url !== undefined) { fields.push(`url=$${i++}`); vals.push(url); }
    if (description !== undefined) { fields.push(`description=$${i++}`); vals.push(description); }
    if (posted_at !== undefined) { fields.push(`posted_at=$${i++}`); vals.push(posted_at); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE videos SET ${fields.join(', ')} WHERE id=$${i} RETURNING *`, vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM videos WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
