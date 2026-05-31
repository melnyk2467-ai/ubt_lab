const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const { user_id } = req.query;
  try {
    let q = `SELECT t.*, u.name as user_name, b.name as bundle_name
             FROM tasks t
             JOIN users u ON u.id = t.user_id
             JOIN bundles b ON b.id = t.bundle_id`;
    const vals = [];
    if (user_id) { q += ` WHERE t.user_id = $1`; vals.push(user_id); }
    q += ` ORDER BY t.created_at DESC`;
    const { rows } = await db.query(q, vals);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { user_id, bundle_id, videos_required = 1, status = 'pending' } = req.body;
  if (!user_id || !bundle_id) return res.status(400).json({ error: 'user_id and bundle_id required' });
  try {
    const { rows } = await db.query(
      'INSERT INTO tasks (user_id, bundle_id, videos_required, status) VALUES ($1,$2,$3,$4) RETURNING *',
      [user_id, bundle_id, videos_required, status]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { user_id, bundle_id, videos_required, status } = req.body;
  try {
    const fields = []; const vals = []; let i = 1;
    if (user_id !== undefined) { fields.push(`user_id=$${i++}`); vals.push(user_id); }
    if (bundle_id !== undefined) { fields.push(`bundle_id=$${i++}`); vals.push(bundle_id); }
    if (videos_required !== undefined) { fields.push(`videos_required=$${i++}`); vals.push(videos_required); }
    if (status !== undefined) { fields.push(`status=$${i++}`); vals.push(status); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id=$${i} RETURNING *`, vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
