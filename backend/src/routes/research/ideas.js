const router = require('express').Router();
const db = require('../../db');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const { status, search } = req.query;
  try {
    let q = `SELECT i.*, u.name AS creator_name
             FROM ideas i JOIN users u ON u.id = i.creator_id`;
    const conds = []; const vals = [];
    if (status) { conds.push(`i.status = $${vals.length + 1}`); vals.push(status); }
    if (search) {
      const p = vals.length + 1;
      conds.push(`(i.title ILIKE $${p} OR i.description ILIKE $${p + 1})`);
      vals.push(`%${search}%`, `%${search}%`);
    }
    if (conds.length) q += ` WHERE ${conds.join(' AND ')}`;
    q += ` ORDER BY i.created_at DESC`;
    const { rows } = await db.query(q, vals);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  const { title, description, source, status = 'new' } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  try {
    const { rows } = await db.query(
      'INSERT INTO ideas (title, description, source, creator_id, status) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [title, description, source, req.user.id, status]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM ideas WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { title, description, source, status } = req.body;
  try {
    const fields = []; const vals = []; let i = 1;
    if (title !== undefined)       { fields.push(`title=$${i++}`);       vals.push(title); }
    if (description !== undefined) { fields.push(`description=$${i++}`); vals.push(description); }
    if (source !== undefined)      { fields.push(`source=$${i++}`);      vals.push(source); }
    if (status !== undefined)      { fields.push(`status=$${i++}`);      vals.push(status); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE ideas SET ${fields.join(', ')} WHERE id=$${i} RETURNING *`, vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM ideas WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
