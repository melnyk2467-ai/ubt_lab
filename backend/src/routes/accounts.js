const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const { user_id } = req.query;
  try {
    let q = `SELECT a.*, u.name as user_name FROM accounts a JOIN users u ON u.id = a.user_id`;
    const vals = [];
    if (user_id) { q += ` WHERE a.user_id = $1`; vals.push(user_id); }
    q += ` ORDER BY a.created_at DESC`;
    const { rows } = await db.query(q, vals);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { user_id, platform, login, status = 'warmup' } = req.body;
  if (!user_id || !platform || !login) return res.status(400).json({ error: 'user_id, platform, login required' });
  try {
    const { rows } = await db.query(
      'INSERT INTO accounts (user_id, platform, login, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, platform, login, status]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM accounts WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { platform, login, status } = req.body;
  try {
    const fields = []; const vals = []; let i = 1;
    if (platform !== undefined) { fields.push(`platform=$${i++}`); vals.push(platform); }
    if (login !== undefined) { fields.push(`login=$${i++}`); vals.push(login); }
    if (status !== undefined) { fields.push(`status=$${i++}`); vals.push(status); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE accounts SET ${fields.join(', ')} WHERE id=$${i} RETURNING *`, vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM accounts WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
