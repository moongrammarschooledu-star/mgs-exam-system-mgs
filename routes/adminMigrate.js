/**
 * One-time-use production migration endpoint.
 *
 * Protected by a shared secret (MIGRATE_SECRET env var) passed via the
 * `x-migrate-secret` header — never wired into any UI, used only to bootstrap
 * a fresh deployment's database from a trusted client (e.g. curl). Safe to
 * call repeatedly: every migration file is idempotent (IF NOT EXISTS / ON
 * CONFLICT DO NOTHING).
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

router.post('/', async (req, res) => {
  const secret = process.env.MIGRATE_SECRET;
  if (!secret || req.headers['x-migrate-secret'] !== secret) {
    return res.status(404).json({ message: 'Not found' });
  }

  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied = [];
  const client = await db.getClient();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        applied.push(file);
      } catch (err) {
        await client.query('ROLLBACK');
        return res.status(500).json({ message: `Migration ${file} failed: ${err.message}`, applied });
      }
    }
    return res.json({ message: 'All migrations applied successfully.', applied });
  } finally {
    client.release();
  }
});

module.exports = router;
