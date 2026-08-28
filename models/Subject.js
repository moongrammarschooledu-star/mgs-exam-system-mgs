const db = require('../config/db');

const Subject = {
  async findAll(classId) {
    if (classId) {
      const { rows } = await db.query(
        `SELECT s.* FROM subjects s
         JOIN class_subjects cs ON cs.subject_id = s.id
         WHERE cs.class_id = $1
         ORDER BY s.name`,
        [classId]
      );
      return rows;
    }
    const { rows } = await db.query('SELECT * FROM subjects ORDER BY name');
    return rows;
  },
  async findById(id) {
    const { rows } = await db.query('SELECT * FROM subjects WHERE id = $1', [id]);
    return rows[0] || null;
  },
  async create({ name, code }) {
    const { rows } = await db.query(
      'INSERT INTO subjects (name, code) VALUES ($1, $2) RETURNING *',
      [name, code]
    );
    return rows[0];
  },
  async update(id, { name, code }) {
    const { rows } = await db.query(
      'UPDATE subjects SET name = COALESCE($2, name), code = COALESCE($3, code) WHERE id = $1 RETURNING *',
      [id, name, code]
    );
    return rows[0] || null;
  },
  async remove(id) {
    const { rowCount } = await db.query('DELETE FROM subjects WHERE id = $1', [id]);
    return rowCount > 0;
  },
  async linkToClass(classId, subjectId) {
    const { rows } = await db.query(
      `INSERT INTO class_subjects (class_id, subject_id) VALUES ($1, $2)
       ON CONFLICT (class_id, subject_id) DO NOTHING RETURNING *`,
      [classId, subjectId]
    );
    return rows[0] || null;
  },
  async unlinkFromClass(classId, subjectId) {
    const { rowCount } = await db.query(
      'DELETE FROM class_subjects WHERE class_id = $1 AND subject_id = $2',
      [classId, subjectId]
    );
    return rowCount > 0;
  },
};

module.exports = Subject;
