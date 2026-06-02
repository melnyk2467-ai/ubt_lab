const router = require('express').Router();
const db = require('../../db');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT w.*, b.name AS bundle_name,
             h.title AS hypothesis_title
      FROM winners w
      LEFT JOIN bundles b ON b.id = w.linked_bundle_id
      LEFT JOIN results r ON r.id = w.linked_result_id
      LEFT JOIN experiments e ON e.id = r.experiment_id
      LEFT JOIN hypotheses h ON h.id = e.hypothesis_id
      ORDER BY w.created_at DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  const { title, linked_result_id, linked_bundle_id, winning_reason, scaling_notes } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO winners (title, linked_result_id, linked_bundle_id, winning_reason, scaling_notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [title, linked_result_id || null, linked_bundle_id || null, winning_reason, scaling_notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM winners WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { title, linked_result_id, linked_bundle_id, winning_reason, scaling_notes } = req.body;
  try {
    const fields = []; const vals = []; let i = 1;
    if (title !== undefined)           { fields.push(`title=$${i++}`);           vals.push(title); }
    if (linked_result_id !== undefined) { fields.push(`linked_result_id=$${i++}`); vals.push(linked_result_id || null); }
    if (linked_bundle_id !== undefined) { fields.push(`linked_bundle_id=$${i++}`); vals.push(linked_bundle_id || null); }
    if (winning_reason !== undefined)  { fields.push(`winning_reason=$${i++}`);  vals.push(winning_reason); }
    if (scaling_notes !== undefined)   { fields.push(`scaling_notes=$${i++}`);   vals.push(scaling_notes); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE winners SET ${fields.join(', ')} WHERE id=$${i} RETURNING *`, vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM winners WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
