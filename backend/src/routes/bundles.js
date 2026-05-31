const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const { offer_id } = req.query;
  try {
    let q = `SELECT b.*, o.name as offer_name, u.name as creator_name
             FROM bundles b
             JOIN offers o ON o.id = b.offer_id
             JOIN users u ON u.id = b.created_by`;
    const vals = [];
    if (offer_id) { q += ` WHERE b.offer_id = $1`; vals.push(offer_id); }
    q += ` ORDER BY b.created_at DESC`;
    const { rows } = await db.query(q, vals);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { offer_id, name, angle, hook, concept, status = 'testing' } = req.body;
  if (!offer_id || !name) return res.status(400).json({ error: 'offer_id and name required' });
  try {
    const { rows } = await db.query(
      'INSERT INTO bundles (offer_id, name, angle, hook, concept, status, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [offer_id, name, angle, hook, concept, status, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM bundles WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { offer_id, name, angle, hook, concept, status } = req.body;
  try {
    const fields = []; const vals = []; let i = 1;
    if (offer_id !== undefined) { fields.push(`offer_id=$${i++}`); vals.push(offer_id); }
    if (name !== undefined) { fields.push(`name=$${i++}`); vals.push(name); }
    if (angle !== undefined) { fields.push(`angle=$${i++}`); vals.push(angle); }
    if (hook !== undefined) { fields.push(`hook=$${i++}`); vals.push(hook); }
    if (concept !== undefined) { fields.push(`concept=$${i++}`); vals.push(concept); }
    if (status !== undefined) { fields.push(`status=$${i++}`); vals.push(status); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE bundles SET ${fields.join(', ')} WHERE id=$${i} RETURNING *`, vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM bundles WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
