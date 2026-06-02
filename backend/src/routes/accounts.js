const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { own, guardOwner } = require('../middleware/ownership');

const isAdmin = r => r.user.role === 'admin';

router.get('/', requireAuth, async (req, res) => {
  let { user_id, status } = req.query;
  try {
    let q = `SELECT a.*, u.name AS user_name
             FROM accounts a
             LEFT JOIN users u ON u.id = a.user_id`;
    const conds = []; const vals = [];

    // Workers see only their own accounts — override any user_id filter
    if (!isAdmin(req)) {
      conds.push(`a.user_id = $${vals.length + 1}`);
      vals.push(req.user.id);
    } else {
      // Admin: support 'unassigned' as a special filter value
      if (user_id === 'unassigned') {
        conds.push('a.user_id IS NULL');
      } else if (user_id) {
        conds.push(`a.user_id = $${vals.length + 1}`);
        vals.push(user_id);
      }
    }

    if (status) { conds.push(`a.status = $${vals.length + 1}`); vals.push(status); }
    if (conds.length) q += ` WHERE ${conds.join(' AND ')}`;
    q += ` ORDER BY a.created_at DESC`;
    const { rows } = await db.query(q, vals);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  let { user_id, platform, login, status = 'warmup' } = req.body;
  if (!platform || !login) return res.status(400).json({ error: 'platform and login required' });

  // Workers may only create accounts for themselves
  if (!isAdmin(req)) user_id = req.user.id;

  try {
    const { rows } = await db.query(
      'INSERT INTO accounts (user_id, platform, login, status) VALUES ($1,$2,$3,$4) RETURNING *',
      [user_id || null, platform, login, status]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      if (!await guardOwner(res, () => own.account(req.user.id, req.params.id))) return;
    }
    const { rows } = await db.query('SELECT * FROM accounts WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  // Workers are read-only on accounts
  if (!isAdmin(req)) return res.status(403).json({ error: 'Workers cannot edit accounts' });

  const { platform, login, status, user_id } = req.body;
  try {
    const fields = []; const vals = []; let i = 1;
    if (platform !== undefined) { fields.push(`platform=$${i++}`); vals.push(platform); }
    if (login    !== undefined) { fields.push(`login=$${i++}`);    vals.push(login); }
    if (status   !== undefined) { fields.push(`status=$${i++}`);   vals.push(status); }
    if ('user_id' in req.body)  { fields.push(`user_id=$${i++}`);  vals.push(user_id || null); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE accounts SET ${fields.join(', ')} WHERE id=$${i} RETURNING *`, vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Workers cannot delete accounts' });
  try {
    const { rowCount } = await db.query('DELETE FROM accounts WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
