const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Public status check — tells the frontend whether any users exist yet.
// Used to hide the "Set up admin account" link after initial setup is complete.
router.get('/status', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT COUNT(*) FROM users');
    res.json({ has_users: parseInt(rows[0].count) > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email.toLowerCase()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Self-registration — always creates a worker account, never admin
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !name.trim())     return res.status(400).json({ error: 'Full name is required' });
  if (!email || !email.trim())   return res.status(400).json({ error: 'Email is required' });
  if (!password)                 return res.status(400).json({ error: 'Password is required' });
  if (password.length < 8)       return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'worker')
       RETURNING id, name, email, role`,
      [name.trim(), email.toLowerCase().trim(), hash]
    );
    const user = rows[0];

    // Auto sign-in: return a token so the frontend can log in immediately
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'An account with this email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// Bootstrap: create first admin (only works if no users exist)
router.post('/setup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

  try {
    const { rows } = await db.query('SELECT COUNT(*) FROM users');
    if (parseInt(rows[0].count) > 0) {
      return res.status(403).json({ error: 'Setup already complete' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email.toLowerCase(), hash, 'admin']
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
