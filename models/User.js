const db = require('../config/db');

const User = {
  async findByEmail(email) {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await db.query(
      'SELECT id, full_name, email, role, is_active, created_at FROM users WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  },

  async create({ fullName, email, passwordHash, role }) {
    const { rows } = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, COALESCE($4, 'teacher'))
       RETURNING id, full_name, email, role, is_active, created_at`,
      [fullName, email, passwordHash, role]
    );
    return rows[0];
  },

  async count() {
    const { rows } = await db.query('SELECT COUNT(*)::int AS count FROM users');
    return rows[0].count;
  },
};

module.exports = User;
