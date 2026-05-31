const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const { bundle_id } = req.query;
  try {
    let q = `SELECT n.*, u.name as author_name FROM notes n JOIN users u ON u.id = n.created_by`;
    const vals = [];
    if (bundle_id) { q += ` WHERE n.bundle_id = $1`; vals.push(bundle_id); }
    q += ` ORDER BY n.created_at DESC`;
    const { rows } = await db.query(q, vals);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { bundle_id, text } = req.body;
  if (!bundle_id || !text) return res.status(400).json({ error: 'bundle_id and text required' });
  try {
    const { rows } = await db.query(
      'INSERT INTO notes (bundle_id, text, created_by) VALUES ($1,$2,$3) RETURNING *',
      [bundle_id, text, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM notes WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
