/**
 * Experiment Results API
 *
 * GET    /context               worker's active experiments for the submit form
 * GET    /                      list  (admin: all+filters; worker: own)
 * POST   /                      submit (workers: platform metrics only; admins: all fields)
 * GET    /:id                   detail
 * PUT    /:id                   update conversion metrics  (admin only)
 * POST   /:id/approve           admin approve
 * POST   /:id/reject            admin reject with feedback
 *
 * Field access rules
 * ──────────────────
 * Worker-submittable:  views, likes, comments, shares, saves,
 *                      account_status, video_status, screenshot_url, notes
 * Admin-only write:    registrations, leads, deposits
 *
 * Filters for GET / (admin only):
 *   ?worker_id=, ?test_bundle_id=, ?test_bundle_experiment_id=,
 *   ?status=, ?date_from=, ?date_to=
 */
const router = require('express').Router();
const db     = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const isAdmin = r => r.user.role === 'admin';

// ── GET /context ──────────────────────────────────────────────────────────────
router.get('/context', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        tbe.id, tbe.name AS experiment_name, tbe.status,
        tb.id   AS test_bundle_id,
        tb.name AS bundle_name,
        tb.geo,
        tb.offer
      FROM test_bundle_experiments tbe
      JOIN test_bundles tb ON tb.id = tbe.test_bundle_id
      WHERE tb.owner_id = $1
        AND tbe.status IN ('planned','running','waiting_result','retest')
      ORDER BY tb.name, tbe.name
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET / — list ──────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const {
    worker_id, test_bundle_id, test_bundle_experiment_id,
    status, date_from, date_to,
  } = req.query;

  try {
    const conds = [];
    const vals  = [];
    let   i     = 1;

    if (!isAdmin(req)) {
      conds.push(`er.worker_id = $${i++}`);
      vals.push(req.user.id);
    } else {
      if (worker_id)                 { conds.push(`er.worker_id = $${i++}`);                  vals.push(worker_id); }
      if (test_bundle_id)            { conds.push(`er.test_bundle_id = $${i++}`);             vals.push(test_bundle_id); }
      if (test_bundle_experiment_id) { conds.push(`er.test_bundle_experiment_id = $${i++}`);  vals.push(test_bundle_experiment_id); }
    }
    if (status)    { conds.push(`er.status = $${i++}`);             vals.push(status); }
    if (date_from) { conds.push(`er.created_at >= $${i++}`);        vals.push(date_from); }
    if (date_to)   { conds.push(`er.created_at <= $${i++}`);        vals.push(date_to + 'T23:59:59Z'); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const { rows } = await db.query(`
      SELECT
        er.*,
        w.name   AS worker_name,
        tb.name  AS bundle_name,
        tbe.name AS experiment_name,
        rev.name AS reviewed_by_name
      FROM experiment_results er
      JOIN users w ON w.id = er.worker_id
      LEFT JOIN test_bundles            tb  ON tb.id  = er.test_bundle_id
      LEFT JOIN test_bundle_experiments tbe ON tbe.id = er.test_bundle_experiment_id
      LEFT JOIN users                   rev ON rev.id = er.reviewed_by
      ${where}
      ORDER BY er.created_at DESC
    `, vals);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST / — submit ───────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const {
    test_bundle_experiment_id,
    // Platform metrics — workers can submit these
    views = 0, likes = 0, comments = 0, shares = 0, saves = 0,
    account_status, video_status, screenshot_url, notes,
    // Conversion metrics — ADMIN ONLY; silently zeroed for workers
    registrations, leads, deposits,
  } = req.body;

  if (!test_bundle_experiment_id) {
    return res.status(400).json({ error: 'test_bundle_experiment_id is required' });
  }

  try {
    // Resolve bundle and verify ownership
    const { rows: expRows } = await db.query(
      `SELECT tbe.id, tbe.test_bundle_id, tb.owner_id
       FROM test_bundle_experiments tbe
       JOIN test_bundles tb ON tb.id = tbe.test_bundle_id
       WHERE tbe.id = $1`,
      [test_bundle_experiment_id]
    );

    if (!expRows[0]) return res.status(404).json({ error: 'Experiment not found' });
    if (!isAdmin(req) && expRows[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only submit results for your own experiments' });
    }

    // Workers cannot set conversion metrics — force to 0
    const safeRegs     = isAdmin(req) ? (parseInt(registrations) || 0) : 0;
    const safeLeads    = isAdmin(req) ? (parseInt(leads)          || 0) : 0;
    const safeDeposits = isAdmin(req) ? (parseInt(deposits)       || 0) : 0;

    const { rows } = await db.query(`
      INSERT INTO experiment_results
        (test_bundle_id, test_bundle_experiment_id, worker_id,
         views, likes, comments, shares, saves,
         account_status, video_status, screenshot_url, notes,
         registrations, leads, deposits)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *
    `, [
      expRows[0].test_bundle_id,
      test_bundle_experiment_id,
      req.user.id,
      parseInt(views)    || 0,
      parseInt(likes)    || 0,
      parseInt(comments) || 0,
      parseInt(shares)   || 0,
      parseInt(saves)    || 0,
      account_status  || null,
      video_status    || null,
      screenshot_url  || null,
      notes           || null,
      safeRegs, safeLeads, safeDeposits,
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /:id — detail ─────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        er.*,
        w.name   AS worker_name,
        tb.name  AS bundle_name,
        tbe.name AS experiment_name,
        rev.name AS reviewed_by_name
      FROM experiment_results er
      JOIN users w ON w.id = er.worker_id
      LEFT JOIN test_bundles            tb  ON tb.id  = er.test_bundle_id
      LEFT JOIN test_bundle_experiments tbe ON tbe.id = er.test_bundle_experiment_id
      LEFT JOIN users                   rev ON rev.id = er.reviewed_by
      WHERE er.id = $1
    `, [req.params.id]);

    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    if (!isAdmin(req) && rows[0].worker_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /:id — admin edits conversion metrics on an existing result ───────────
router.put('/:id', requireAdmin, async (req, res) => {
  const { registrations, leads, deposits, admin_feedback } = req.body;

  const fields = [];
  const vals   = [];
  let   i      = 1;

  const add = (col, val) => { fields.push(`${col}=$${i++}`); vals.push(val); };

  if (registrations !== undefined) add('registrations',  parseInt(registrations) || 0);
  if (leads         !== undefined) add('leads',          parseInt(leads)         || 0);
  if (deposits      !== undefined) add('deposits',       parseInt(deposits)      || 0);
  if (admin_feedback !== undefined) add('admin_feedback', admin_feedback || null);

  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

  fields.push('updated_at=NOW()');
  vals.push(req.params.id);

  try {
    const { rows } = await db.query(
      `UPDATE experiment_results SET ${fields.join(', ')} WHERE id=$${i} RETURNING *`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /:id/approve ─────────────────────────────────────────────────────────
router.post('/:id/approve', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(`
      UPDATE experiment_results
      SET status='approved', reviewed_by=$1, reviewed_at=NOW(), updated_at=NOW()
      WHERE id=$2 AND status='submitted'
      RETURNING *
    `, [req.user.id, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found or already reviewed' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /:id/reject ──────────────────────────────────────────────────────────
router.post('/:id/reject', requireAdmin, async (req, res) => {
  const { admin_feedback } = req.body;
  try {
    const { rows } = await db.query(`
      UPDATE experiment_results
      SET status='rejected', admin_feedback=$1,
          reviewed_by=$2, reviewed_at=NOW(), updated_at=NOW()
      WHERE id=$3 AND status='submitted'
      RETURNING *
    `, [admin_feedback || null, req.user.id, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found or already reviewed' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
