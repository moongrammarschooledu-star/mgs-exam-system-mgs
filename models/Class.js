const db = require('../config/db');

const Class = {
  async findAll() {
    const { rows } = await db.query(`
      SELECT c.*,
        (SELECT COUNT(*)::int FROM sections s WHERE s.class_id = c.id) AS section_count,
        (SELECT COUNT(*)::int FROM students st WHERE st.class_id = c.id AND st.status = 'active') AS student_count
      FROM classes c
      ORDER BY c.sort_order, c.name
    `);
    return rows;
  },
  async findById(id) {
    const { rows } = await db.query('SELECT * FROM classes WHERE id = $1', [id]);
    return rows[0] || null;
  },
  async create({ name, sortOrder }) {
    const { rows } = await db.query(
      'INSERT INTO classes (name, sort_order) VALUES ($1, COALESCE($2, 0)) RETURNING *',
      [name, sortOrder]
    );
    return rows[0];
  },
  async update(id, { name, sortOrder }) {
    const { rows } = await db.query(
      `UPDATE classes SET name = COALESCE($2, name), sort_order = COALESCE($3, sort_order)
       WHERE id = $1 RETURNING *`,
      [id, name, sortOrder]
    );
    return rows[0] || null;
  },
  async remove(id) {
    const { rowCount } = await db.query('DELETE FROM classes WHERE id = $1', [id]);
    return rowCount > 0;
  },
};

module.exports = Class;
