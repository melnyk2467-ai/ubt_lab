/**
 * Test Bundles API — UBT/iGaming testing combinations
 *
 * GET    /              list with filters + search (admin: all; worker: own)
 * POST   /              create                     (admin)
 * GET    /:id           detail                     (admin: any; worker: own)
 * PUT    /:id           update                     (admin)
 * DELETE /:id           delete                     (admin)
 */
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ── GET / — list with filters & search ───────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const { status, geo, offer, source_platform, owner_id, search } = req.query;

  try {
    const conditions = [];
    const vals = [];
    let i = 1;

    // Workers see only their own bundles
    if (!isAdmin) {
      conditions.push(`tb.owner_id = $${i++}`);
      vals.push(req.user.id);
    } else if (owner_id) {
      conditions.push(`tb.owner_id = $${i++}`);
      vals.push(owner_id);
    }

    if (status)          { conditions.push(`tb.status = $${i++}`);                     vals.push(status); }
    if (geo)             { conditions.push(`tb.geo ILIKE $${i++}`);                    vals.push(`%${geo}%`); }
    if (offer)           { conditions.push(`tb.offer ILIKE $${i++}`);                  vals.push(`%${offer}%`); }
    if (source_platform) { conditions.push(`tb.source_platform ILIKE $${i++}`);        vals.push(`%${source_platform}%`); }
    if (search) {
      conditions.push(`(
        tb.name         ILIKE $${i}   OR
        tb.offer        ILIKE $${i}   OR
        tb.hypothesis   ILIKE $${i}   OR
        tb.notes        ILIKE $${i}
      )`);
      vals.push(`%${search}%`); i++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await db.query(`
      SELECT
        tb.*,
        u.name  AS owner_name,
        u.email AS owner_email
      FROM test_bundles tb
      LEFT JOIN users u ON u.id = tb.owner_id
      ${where}
      ORDER BY tb.created_at DESC
    `, vals);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST / — create ───────────────────────────────────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  const {
    name, status = 'draft', geo, offer, source_platform, account_type,
    proxy_setup, creative_angle, hypothesis, owner_id,
    start_date, end_date, notes,
  } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const { rows } = await db.query(`
      INSERT INTO test_bundles
        (name, status, geo, offer, source_platform, account_type,
         proxy_setup, creative_angle, hypothesis, owner_id,
         start_date, end_date, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
    `, [
      name, status,
      geo || null, offer || null, source_platform || null, account_type || null,
      proxy_setup || null, creative_angle || null, hypothesis || null,
      owner_id || null,
      start_date || null, end_date || null, notes || null,
    ]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /:id — detail ─────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  try {
    const { rows } = await db.query(`
      SELECT tb.*, u.name AS owner_name, u.email AS owner_email
      FROM test_bundles tb
      LEFT JOIN users u ON u.id = tb.owner_id
      WHERE tb.id = $1
    `, [req.params.id]);

    if (!rows[0]) return res.status(404).json({ error: 'Not found' });

    // Workers can only access their own bundles
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
    name, status, geo, offer, source_platform, account_type,
    proxy_setup, creative_angle, hypothesis, owner_id,
    start_date, end_date, notes,
  } = req.body;

  const fields = [];
  const vals = [];
  let i = 1;

  const add = (col, val) => { fields.push(`${col}=$${i++}`); vals.push(val); };

  if (name            !== undefined) add('name',            name);
  if (status          !== undefined) add('status',          status);
  if (geo             !== undefined) add('geo',             geo || null);
  if (offer           !== undefined) add('offer',           offer || null);
  if (source_platform !== undefined) add('source_platform', source_platform || null);
  if (account_type    !== undefined) add('account_type',    account_type || null);
  if (proxy_setup     !== undefined) add('proxy_setup',     proxy_setup || null);
  if (creative_angle  !== undefined) add('creative_angle',  creative_angle || null);
  if (hypothesis      !== undefined) add('hypothesis',      hypothesis || null);
  if (owner_id        !== undefined) add('owner_id',        owner_id || null);
  if (start_date      !== undefined) add('start_date',      start_date || null);
  if (end_date        !== undefined) add('end_date',        end_date || null);
  if (notes           !== undefined) add('notes',           notes || null);

  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

  // Always bump updated_at
  fields.push(`updated_at=NOW()`);
  vals.push(req.params.id);

  try {
    const { rows } = await db.query(
      `UPDATE test_bundles SET ${fields.join(', ')} WHERE id=$${i} RETURNING *`,
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
    const { rowCount } = await db.query('DELETE FROM test_bundles WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
