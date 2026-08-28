const db = require('../config/db');

const AcademicSession = {
  async findAll() {
    const { rows } = await db.query('SELECT * FROM academic_sessions ORDER BY start_date DESC');
    return rows;
  },
  async findById(id) {
    const { rows } = await db.query('SELECT * FROM academic_sessions WHERE id = $1', [id]);
    return rows[0] || null;
  },
  async findCurrent() {
    const { rows } = await db.query('SELECT * FROM academic_sessions WHERE is_current = true LIMIT 1');
    return rows[0] || null;
  },
  async create({ name, startDate, endDate, isCurrent }) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      if (isCurrent) {
        await client.query('UPDATE academic_sessions SET is_current = false WHERE is_current = true');
      }
      const { rows } = await client.query(
        `INSERT INTO academic_sessions (name, start_date, end_date, is_current)
         VALUES ($1, $2, $3, COALESCE($4, false)) RETURNING *`,
        [name, startDate, endDate, isCurrent]
      );
      await client.query('COMMIT');
      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
  async update(id, { name, startDate, endDate, isCurrent }) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      if (isCurrent) {
        await client.query('UPDATE academic_sessions SET is_current = false WHERE is_current = true');
      }
      const { rows } = await client.query(
        `UPDATE academic_sessions
         SET name = COALESCE($2, name),
             start_date = COALESCE($3, start_date),
             end_date = COALESCE($4, end_date),
             is_current = COALESCE($5, is_current)
         WHERE id = $1 RETURNING *`,
        [id, name, startDate, endDate, isCurrent]
      );
      await client.query('COMMIT');
      return rows[0] || null;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
  async remove(id) {
    const { rowCount } = await db.query('DELETE FROM academic_sessions WHERE id = $1', [id]);
    return rowCount > 0;
  },
};

module.exports = AcademicSession;
