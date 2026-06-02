/**
 * Ownership helpers — used inside route handlers to verify a worker
 * can only touch their own data. Admin callers skip these checks.
 */
const db = require('../db');

const own = {
  /** Account belongs to this worker */
  async account(userId, accountId) {
    const { rows } = await db.query(
      'SELECT 1 FROM accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId]
    );
    return rows.length > 0;
  },

  /** Task assigned to this worker */
  async task(userId, taskId) {
    const { rows } = await db.query(
      'SELECT 1 FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );
    return rows.length > 0;
  },

  /** Video connected to one of this worker's accounts */
  async video(userId, videoId) {
    const { rows } = await db.query(
      `SELECT 1 FROM videos v
       JOIN accounts a ON a.id = v.account_id
       WHERE v.id = $1 AND a.user_id = $2`,
      [videoId, userId]
    );
    return rows.length > 0;
  },

  /** Metric connected to one of this worker's videos */
  async metric(userId, metricId) {
    const { rows } = await db.query(
      `SELECT 1 FROM metrics m
       JOIN videos   v ON v.id = m.video_id
       JOIN accounts a ON a.id = v.account_id
       WHERE m.id = $1 AND a.user_id = $2`,
      [metricId, userId]
    );
    return rows.length > 0;
  },

  /** Experiment assigned to this worker */
  async experiment(userId, experimentId) {
    const { rows } = await db.query(
      'SELECT 1 FROM experiments WHERE id = $1 AND assigned_worker_id = $2',
      [experimentId, userId]
    );
    return rows.length > 0;
  },
};

/** Convenience: send 403 if worker doesn't own a resource. */
async function guardOwner(res, check) {
  const ok = await check();
  if (!ok) { res.status(403).json({ error: 'Access denied' }); return false; }
  return true;
}

module.exports = { own, guardOwner };
