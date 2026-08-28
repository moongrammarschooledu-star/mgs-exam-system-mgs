const db = require('../config/db');

const Section = {
  async findAll(classId) {
    const params = [];
    let where = '';
    if (classId) {
      params.push(classId);
      where = 'WHERE s.class_id = $1';
    }
    const { rows } = await db.query(
      `SELECT s.*, c.name AS class_name
       FROM sections s JOIN classes c ON c.id = s.class_id
       ${where}
       ORDER BY c.sort_order, s.name`,
      params
    );
    return rows;
  },
  async findById(id) {
    const { rows } = await db.query('SELECT * FROM sections WHERE id = $1', [id]);
    return rows[0] || null;
  },
  async create({ classId, name }) {
    const { rows } = await db.query(
      'INSERT INTO sections (class_id, name) VALUES ($1, $2) RETURNING *',
      [classId, name]
    );
    return rows[0];
  },
  async update(id, { name }) {
    const { rows } = await db.query(
      'UPDATE sections SET name = COALESCE($2, name) WHERE id = $1 RETURNING *',
      [id, name]
    );
    return rows[0] || null;
  },
  async remove(id) {
    const { rowCount } = await db.query('DELETE FROM sections WHERE id = $1', [id]);
    return rowCount > 0;
  },
};

module.exports = Section;
