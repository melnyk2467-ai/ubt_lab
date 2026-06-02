const router = require('express').Router();
const db = require('../../db');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const { status, priority } = req.query;
  try {
    let q = `SELECT h.*, u.name AS creator_name, p.title AS pattern_title
             FROM hypotheses h
             JOIN users u ON u.id = h.creator_id
             LEFT JOIN patterns p ON p.id = h.linked_pattern_id`;
    const conds = []; const vals = [];
    if (status)   { conds.push(`h.status = $${vals.length + 1}`);   vals.push(status); }
    if (priority) { conds.push(`h.priority = $${vals.length + 1}`); vals.push(priority); }
    if (conds.length) q += ` WHERE ${conds.join(' AND ')}`;
    q += ` ORDER BY h.created_at DESC`;
    const { rows } = await db.query(q, vals);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  const { title, description, linked_pattern_id, expected_result, priority = 'medium', status = 'planned' } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO hypotheses (title, description, linked_pattern_id, expected_result, priority, status, creator_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, description, linked_pattern_id || null, expected_result, priority, status, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM hypotheses WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { title, description, linked_pattern_id, expected_result, priority, status } = req.body;
  try {
    const fields = []; const vals = []; let i = 1;
    if (title !== undefined)             { fields.push(`title=$${i++}`);             vals.push(title); }
    if (description !== undefined)       { fields.push(`description=$${i++}`);       vals.push(description); }
    if (linked_pattern_id !== undefined) { fields.push(`linked_pattern_id=$${i++}`); vals.push(linked_pattern_id || null); }
    if (expected_result !== undefined)   { fields.push(`expected_result=$${i++}`);   vals.push(expected_result); }
    if (priority !== undefined)          { fields.push(`priority=$${i++}`);          vals.push(priority); }
    if (status !== undefined)            { fields.push(`status=$${i++}`);            vals.push(status); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE hypotheses SET ${fields.join(', ')} WHERE id=$${i} RETURNING *`, vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM hypotheses WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
