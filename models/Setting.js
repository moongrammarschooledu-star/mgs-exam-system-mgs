const db = require('../config/db');

const Setting = {
  async all() {
    const { rows } = await db.query('SELECT key, value FROM app_settings ORDER BY key');
    const obj = {};
    rows.forEach((r) => { obj[r.key] = r.value; });
    return obj;
  },

  async get(key) {
    const { rows } = await db.query('SELECT value FROM app_settings WHERE key = $1', [key]);
    return rows[0] ? rows[0].value : null;
  },

  async set(key, value) {
    const { rows } = await db.query(
      `INSERT INTO app_settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
       RETURNING *`,
      [key, value]
    );
    return rows[0];
  },
};

module.exports = Setting;
