const router = require('express').Router();
const db = require('../../db');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const { experiment_id } = req.query;
  try {
    let q = `SELECT r.*, h.title AS hypothesis_title, e.notes AS experiment_notes
             FROM results r
             JOIN experiments e ON e.id = r.experiment_id
             JOIN hypotheses  h ON h.id = e.hypothesis_id`;
    const vals = [];
    if (experiment_id) { q += ` WHERE r.experiment_id = $1`; vals.push(experiment_id); }
    q += ` ORDER BY r.created_at DESC`;
    const { rows } = await db.query(q, vals);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  const { experiment_id, views = 0, likes = 0, comments = 0, shares = 0,
          watch_time = 0, conversion_notes, conclusion } = req.body;
  if (!experiment_id) return res.status(400).json({ error: 'experiment_id required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO results
         (experiment_id, views, likes, comments, shares, watch_time, conversion_notes, conclusion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [experiment_id, views, likes, comments, shares, watch_time, conversion_notes, conclusion]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM results WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { views, likes, comments, shares, watch_time, conversion_notes, conclusion } = req.body;
  try {
    const fields = []; const vals = []; let i = 1;
    if (views !== undefined)            { fields.push(`views=$${i++}`);            vals.push(views); }
    if (likes !== undefined)            { fields.push(`likes=$${i++}`);            vals.push(likes); }
    if (comments !== undefined)         { fields.push(`comments=$${i++}`);         vals.push(comments); }
    if (shares !== undefined)           { fields.push(`shares=$${i++}`);           vals.push(shares); }
    if (watch_time !== undefined)       { fields.push(`watch_time=$${i++}`);       vals.push(watch_time); }
    if (conversion_notes !== undefined) { fields.push(`conversion_notes=$${i++}`); vals.push(conversion_notes); }
    if (conclusion !== undefined)       { fields.push(`conclusion=$${i++}`);       vals.push(conclusion); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE results SET ${fields.join(', ')} WHERE id=$${i} RETURNING *`, vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM results WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
