const router = require('express').Router();
const db = require('../../db');
const { requireAuth, requireAdmin } = require('../../middleware/auth');
const { own, guardOwner } = require('../../middleware/ownership');

const isAdmin = r => r.user.role === 'admin';

router.get('/', requireAuth, async (req, res) => {
  const { status } = req.query;
  try {
    let q = `SELECT e.*,
               h.title  AS hypothesis_title,
               u.name   AS worker_name,
               a.login  AS account_login, a.platform,
               b.name   AS bundle_name
             FROM experiments e
             JOIN hypotheses h ON h.id = e.hypothesis_id
             LEFT JOIN users    u ON u.id = e.assigned_worker_id
             LEFT JOIN accounts a ON a.id = e.assigned_account_id
             LEFT JOIN bundles  b ON b.id = e.assigned_bundle_id`;
    const conds = []; const vals = [];
    // Workers see only experiments assigned to them
    if (!isAdmin(req)) {
      conds.push(`e.assigned_worker_id = $${vals.length + 1}`);
      vals.push(req.user.id);
    }
    if (status) { conds.push(`e.status = $${vals.length + 1}`); vals.push(status); }
    if (conds.length) q += ` WHERE ${conds.join(' AND ')}`;
    q += ` ORDER BY e.created_at DESC`;
    const { rows } = await db.query(q, vals);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  const { hypothesis_id, assigned_worker_id, assigned_account_id, assigned_bundle_id,
          start_date, end_date, status = 'active', notes } = req.body;
  if (!hypothesis_id) return res.status(400).json({ error: 'hypothesis_id required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO experiments
         (hypothesis_id, assigned_worker_id, assigned_account_id, assigned_bundle_id,
          start_date, end_date, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [hypothesis_id, assigned_worker_id || null, assigned_account_id || null,
       assigned_bundle_id || null, start_date || null, end_date || null, status, notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      if (!await guardOwner(res, () => own.experiment(req.user.id, req.params.id))) return;
    }
    const { rows } = await db.query('SELECT * FROM experiments WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { hypothesis_id, assigned_worker_id, assigned_account_id, assigned_bundle_id,
          start_date, end_date, status, notes } = req.body;
  try {
    const fields = []; const vals = []; let i = 1;
    if (hypothesis_id !== undefined)       { fields.push(`hypothesis_id=$${i++}`);        vals.push(hypothesis_id); }
    if (assigned_worker_id !== undefined)  { fields.push(`assigned_worker_id=$${i++}`);   vals.push(assigned_worker_id || null); }
    if (assigned_account_id !== undefined) { fields.push(`assigned_account_id=$${i++}`);  vals.push(assigned_account_id || null); }
    if (assigned_bundle_id !== undefined)  { fields.push(`assigned_bundle_id=$${i++}`);   vals.push(assigned_bundle_id || null); }
    if (start_date !== undefined)          { fields.push(`start_date=$${i++}`);           vals.push(start_date || null); }
    if (end_date !== undefined)            { fields.push(`end_date=$${i++}`);             vals.push(end_date || null); }
    if (status !== undefined)              { fields.push(`status=$${i++}`);               vals.push(status); }
    if (notes !== undefined)               { fields.push(`notes=$${i++}`);               vals.push(notes); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE experiments SET ${fields.join(', ')} WHERE id=$${i} RETURNING *`, vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM experiments WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
