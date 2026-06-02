/**
 * Proxies API
 *
 * GET    /              list proxies (admin: all+filters; worker: own assigned)
 * POST   /              create proxy                  (admin)
 * PUT    /:id           update proxy                  (admin)
 * DELETE /:id           delete proxy                  (admin)
 * POST   /:id/assign-worker/:workerId    assign worker  (admin)
 * DELETE /:id/assign-worker             unassign worker (admin)
 * POST   /:id/assign-account/:accountId assign account (admin)
 * DELETE /:id/assign-account            unassign account (admin)
 */
const router = require('express').Router();
const db     = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ── Helpers ───────────────────────────────────────────────────────────────────

// Mask password for non-admin / visible_to_worker=false contexts
function maskProxy(p, isAdmin) {
  if (isAdmin) return p;
  if (!p.visible_to_worker) {
    return { ...p, password: p.password ? '••••••••' : null, username: p.username ? '••••••••' : null };
  }
  return p;
}

// ── GET / — list ──────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  try {
    let query, params = [];

    if (isAdmin) {
      const { status, country, worker_id } = req.query;
      const conditions = [];
      if (status)    { params.push(status);    conditions.push(`p.status = $${params.length}`); }
      if (country)   { params.push(`%${country}%`); conditions.push(`p.country ILIKE $${params.length}`); }
      if (worker_id) { params.push(worker_id); conditions.push(`p.assigned_worker_id = $${params.length}`); }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      query = `
        SELECT
          p.*,
          w.name  AS worker_name,
          a.login AS account_login, a.platform AS account_platform
        FROM proxies p
        LEFT JOIN users    w ON w.id = p.assigned_worker_id
        LEFT JOIN accounts a ON a.id = p.assigned_account_id
        ${where}
        ORDER BY p.created_at DESC
      `;
    } else {
      // Worker: only own assigned proxies
      params = [req.user.id];
      query = `
        SELECT
          p.id, p.name, p.host, p.port, p.username, p.password,
          p.type, p.country, p.status, p.notes,
          p.assigned_worker_id, p.assigned_account_id,
          p.visible_to_worker, p.created_at,
          a.login AS account_login, a.platform AS account_platform
        FROM proxies p
        LEFT JOIN accounts a ON a.id = p.assigned_account_id
        WHERE p.assigned_worker_id = $1
        ORDER BY p.created_at DESC
      `;
    }

    const { rows } = await db.query(query, params);
    const result = rows.map(p => maskProxy(p, isAdmin));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST / — create ───────────────────────────────────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  const { name, host, port, username, password, type, country, status, notes, visible_to_worker } = req.body;
  if (!name || !host || !port) return res.status(400).json({ error: 'name, host, port required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO proxies (name, host, port, username, password, type, country, status, notes, visible_to_worker)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [name, host, port, username || null, password || null,
       type || 'http', country || null, status || 'active',
       notes || null, visible_to_worker || false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /:id — update ─────────────────────────────────────────────────────────
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, host, port, username, password, type, country, status, notes, visible_to_worker } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE proxies
       SET name=$1, host=$2, port=$3, username=$4, password=$5,
           type=$6, country=$7, status=$8, notes=$9, visible_to_worker=$10
       WHERE id=$11
       RETURNING *`,
      [name, host, port, username || null, password || null,
       type, country || null, status, notes || null,
       visible_to_worker || false, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Proxy not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /:id — delete ──────────────────────────────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM proxies WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Proxy not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /:id/assign-worker/:workerId ─────────────────────────────────────────
router.post('/:id/assign-worker/:workerId', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE proxies SET assigned_worker_id=$1 WHERE id=$2 RETURNING *`,
      [req.params.workerId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Proxy not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /:id/assign-worker — unassign worker ───────────────────────────────
router.delete('/:id/assign-worker', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE proxies SET assigned_worker_id=NULL WHERE id=$1 RETURNING id`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Proxy not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /:id/assign-account/:accountId ──────────────────────────────────────
router.post('/:id/assign-account/:accountId', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE proxies SET assigned_account_id=$1 WHERE id=$2 RETURNING *`,
      [req.params.accountId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Proxy not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /:id/assign-account — unassign account ────────────────────────────
router.delete('/:id/assign-account', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE proxies SET assigned_account_id=NULL WHERE id=$1 RETURNING id`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Proxy not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
