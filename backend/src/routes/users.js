const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { name, email, password, role = 'worker' } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, is_active, created_at',
      [name, email.toLowerCase(), hash, role]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { name, email, password, role, is_active } = req.body;
  try {
    const fields = [];
    const vals = [];
    let i = 1;
    if (name !== undefined) { fields.push(`name=$${i++}`); vals.push(name); }
    if (email !== undefined) { fields.push(`email=$${i++}`); vals.push(email.toLowerCase()); }
    if (password) { fields.push(`password_hash=$${i++}`); vals.push(await bcrypt.hash(password, 10)); }
    if (role !== undefined) { fields.push(`role=$${i++}`); vals.push(role); }
    if (is_active !== undefined) { fields.push(`is_active=$${i++}`); vals.push(is_active); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id=$${i} RETURNING id, name, email, role, is_active, created_at`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /:id/role — safe role promotion / demotion ─────────────────────────
// Safety checks (all enforced server-side):
//   1. Requester must be admin           (requireAdmin)
//   2. Role must be 'admin' or 'worker'
//   3. Target user must exist
//   4. Requester cannot change their own role
//   5. Cannot remove the last remaining admin
// All changes are logged to admin_role_changes.
router.patch('/:id/role', requireAdmin, async (req, res) => {
  const { role } = req.body;
  const targetId = req.params.id;
  const requesterId = req.user.id;

  if (!['admin', 'worker'].includes(role)) {
    return res.status(400).json({ error: 'role must be admin or worker' });
  }
  if (targetId === requesterId) {
    return res.status(400).json({ error: 'You cannot change your own role' });
  }

  try {
    // Fetch target user
    const { rows: targetRows } = await db.query(
      'SELECT id, name, role FROM users WHERE id = $1', [targetId]
    );
    if (!targetRows[0]) return res.status(404).json({ error: 'User not found' });

    const target = targetRows[0];
    if (target.role === role) {
      return res.status(400).json({ error: `User is already a ${role}` });
    }

    // If demoting an admin → ensure at least one other admin remains
    if (target.role === 'admin' && role === 'worker') {
      const { rows: adminCount } = await db.query(
        "SELECT COUNT(*) FROM users WHERE role = 'admin'"
      );
      if (parseInt(adminCount[0].count) <= 1) {
        return res.status(400).json({ error: 'Cannot demote the last remaining admin' });
      }
    }

    // Apply role change
    const { rows: updated } = await db.query(
      `UPDATE users SET role = $1 WHERE id = $2
       RETURNING id, name, email, role, is_active, created_at`,
      [role, targetId]
    );

    // Audit log
    await db.query(
      `INSERT INTO admin_role_changes (changed_by, target_user, old_role, new_role)
       VALUES ($1, $2, $3, $4)`,
      [requesterId, targetId, target.role, role]
    );

    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
