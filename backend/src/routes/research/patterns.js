const router = require('express').Router();
const db = require('../../db');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

// List all patterns (with linked idea count and idea array)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT p.*, u.name AS creator_name,
             COUNT(pi.idea_id)::int AS idea_count,
             COALESCE(
               json_agg(json_build_object('id', i.id, 'title', i.title))
               FILTER (WHERE i.id IS NOT NULL), '[]'
             ) AS linked_ideas
      FROM patterns p
      JOIN users u ON u.id = p.creator_id
      LEFT JOIN pattern_ideas pi ON pi.pattern_id = p.id
      LEFT JOIN ideas i ON i.id = pi.idea_id
      GROUP BY p.id, u.name
      ORDER BY p.created_at DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  const { title, description, confidence_score = 5, idea_ids = [] } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO patterns (title, description, creator_id, confidence_score) VALUES ($1,$2,$3,$4) RETURNING *',
      [title, description, req.user.id, confidence_score]
    );
    const pattern = rows[0];
    for (const idea_id of idea_ids) {
      await client.query(
        'INSERT INTO pattern_ideas (pattern_id, idea_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [pattern.id, idea_id]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(pattern);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT p.*, u.name AS creator_name,
             COALESCE(
               json_agg(json_build_object('id', i.id, 'title', i.title))
               FILTER (WHERE i.id IS NOT NULL), '[]'
             ) AS linked_ideas
      FROM patterns p
      JOIN users u ON u.id = p.creator_id
      LEFT JOIN pattern_ideas pi ON pi.pattern_id = p.id
      LEFT JOIN ideas i ON i.id = pi.idea_id
      WHERE p.id = $1
      GROUP BY p.id, u.name
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { title, description, confidence_score, idea_ids } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const fields = []; const vals = []; let i = 1;
    if (title !== undefined)            { fields.push(`title=$${i++}`);            vals.push(title); }
    if (description !== undefined)      { fields.push(`description=$${i++}`);      vals.push(description); }
    if (confidence_score !== undefined) { fields.push(`confidence_score=$${i++}`); vals.push(confidence_score); }
    if (fields.length) {
      vals.push(req.params.id);
      const { rows } = await client.query(
        `UPDATE patterns SET ${fields.join(', ')} WHERE id=$${i} RETURNING *`, vals
      );
      if (!rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    }
    if (Array.isArray(idea_ids)) {
      await client.query('DELETE FROM pattern_ideas WHERE pattern_id = $1', [req.params.id]);
      for (const idea_id of idea_ids) {
        await client.query(
          'INSERT INTO pattern_ideas (pattern_id, idea_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [req.params.id, idea_id]
        );
      }
    }
    await client.query('COMMIT');
    // Return updated pattern
    const { rows: updated } = await db.query('SELECT * FROM patterns WHERE id = $1', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM patterns WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
