/**
 * Test Bundle Experiments API
 *
 * GET    /              list (admin: all+filters; worker: own bundles only)
 * POST   /              create  (admin only)
 * GET    /:id           detail  (admin: any; worker: own)
 * PUT    /:id           update  (admin only)
 * DELETE /:id           delete  (admin only)
 *
 * Query params for GET /:
 *   ?test_bundle_id=   filter by bundle
 *   ?status=           filter by exact status
 *   ?active=true       shortcut: planned | running | waiting_result | retest
 */
const router = require('express').Router();
const db     = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const ACTIVE_STATUSES = ['planned', 'running', 'waiting_result', 'retest'];

// ── GET / — list ──────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const { test_bundle_id, status, active } = req.query;

  try {
    const conds = [];
    const vals  = [];
    let   i     = 1;

    if (!isAdmin) {
      // Workers can only see experiments belonging to their bundles
      conds.push(`tb.owner_id = $${i++}`);
      vals.push(req.user.id);
    }

    if (test_bundle_id) { conds.push(`tbe.test_bundle_id = $${i++}`); vals.push(test_bundle_id); }
    if (status)         { conds.push(`tbe.status = $${i++}`);          vals.push(status); }
    if (active === 'true') {
      conds.push(`tbe.status = ANY($${i++})`);
      vals.push(ACTIVE_STATUSES);
    }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const { rows } = await db.query(`
      SELECT
        tbe.*,
        tb.name     AS bundle_name,
        tb.geo      AS bundle_geo,
        tb.offer    AS bundle_offer,
        u.name      AS owner_name
      FROM test_bundle_experiments tbe
      JOIN test_bundles tb ON tb.id = tbe.test_bundle_id
      LEFT JOIN users u ON u.id = tb.owner_id
      ${where}
      ORDER BY tbe.created_at DESC
    `, vals);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST / — create ───────────────────────────────────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  const {
    test_bundle_id, name, status = 'planned',
    test_goal, variable_tested, setup_notes,
    start_date, end_date, result_summary, conclusion,
  } = req.body;

  if (!test_bundle_id) return res.status(400).json({ error: 'test_bundle_id is required' });
  if (!name)           return res.status(400).json({ error: 'name is required' });

  try {
    const { rows } = await db.query(`
      INSERT INTO test_bundle_experiments
        (test_bundle_id, name, status, test_goal, variable_tested,
         setup_notes, start_date, end_date, result_summary, conclusion)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `, [
      test_bundle_id, name, status,
      test_goal || null, variable_tested || null, setup_notes || null,
      start_date || null, end_date || null,
      result_summary || null, conclusion || null,
    ]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(404).json({ error: 'Bundle not found' });
    res.status(500).json({ error: err.message });
  }
});

// ── GET /:id — detail ─────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  try {
    const { rows } = await db.query(`
      SELECT tbe.*, tb.name AS bundle_name, tb.owner_id
      FROM test_bundle_experiments tbe
      JOIN test_bundles tb ON tb.id = tbe.test_bundle_id
      WHERE tbe.id = $1
    `, [req.params.id]);

    if (!rows[0]) return res.status(404).json({ error: 'Not found' });

    if (!isAdmin && rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /:id — update ─────────────────────────────────────────────────────────
router.put('/:id', requireAdmin, async (req, res) => {
  const {
    name, status, test_goal, variable_tested,
    setup_notes, start_date, end_date, result_summary, conclusion,
  } = req.body;

  const fields = [];
  const vals   = [];
  let   i      = 1;

  const add = (col, val) => { fields.push(`${col}=$${i++}`); vals.push(val); };

  if (name            !== undefined) add('name',            name);
  if (status          !== undefined) add('status',          status);
  if (test_goal       !== undefined) add('test_goal',       test_goal       || null);
  if (variable_tested !== undefined) add('variable_tested', variable_tested || null);
  if (setup_notes     !== undefined) add('setup_notes',     setup_notes     || null);
  if (start_date      !== undefined) add('start_date',      start_date      || null);
  if (end_date        !== undefined) add('end_date',        end_date        || null);
  if (result_summary  !== undefined) add('result_summary',  result_summary  || null);
  if (conclusion      !== undefined) add('conclusion',      conclusion      || null);

  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

  fields.push('updated_at=NOW()');
  vals.push(req.params.id);

  try {
    const { rows } = await db.query(
      `UPDATE test_bundle_experiments SET ${fields.join(', ')} WHERE id=$${i} RETURNING *`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM test_bundle_experiments WHERE id=$1', [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
