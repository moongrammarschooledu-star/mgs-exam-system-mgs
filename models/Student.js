const db = require('../config/db');

const Student = {
  async findAll({ classId, sectionId, status } = {}) {
    const conditions = [];
    const params = [];
    if (classId) { params.push(classId); conditions.push(`s.class_id = $${params.length}`); }
    if (sectionId) { params.push(sectionId); conditions.push(`s.section_id = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`s.status = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await db.query(
      `SELECT s.*, c.name AS class_name, sec.name AS section_name
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN sections sec ON sec.id = s.section_id
       ${where}
       ORDER BY c.sort_order NULLS LAST, sec.name, s.roll_number, s.full_name`,
      params
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT s.*, c.name AS class_name, sec.name AS section_name
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN sections sec ON sec.id = s.section_id
       WHERE s.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async create({ admissionNo, fullName, rollNumber, classId, sectionId, photoUrl, guardianName, status }) {
    const { rows } = await db.query(
      `INSERT INTO students (admission_no, full_name, roll_number, class_id, section_id, photo_url, guardian_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'active'))
       RETURNING *`,
      [admissionNo, fullName, rollNumber || null, classId || null, sectionId || null, photoUrl || null, guardianName || null, status]
    );
    return rows[0];
  },

  async update(id, { fullName, rollNumber, classId, sectionId, photoUrl, guardianName, status }) {
    const { rows } = await db.query(
      `UPDATE students SET
         full_name = COALESCE($2, full_name),
         roll_number = COALESCE($3, roll_number),
         class_id = COALESCE($4, class_id),
         section_id = COALESCE($5, section_id),
         photo_url = COALESCE($6, photo_url),
         guardian_name = COALESCE($7, guardian_name),
         status = COALESCE($8, status)
       WHERE id = $1 RETURNING *`,
      [id, fullName, rollNumber, classId, sectionId, photoUrl, guardianName, status]
    );
    return rows[0] || null;
  },

  async remove(id) {
    const { rowCount } = await db.query('DELETE FROM students WHERE id = $1', [id]);
    return rowCount > 0;
  },

  async countByClassSection() {
    const { rows } = await db.query(
      `SELECT class_id, section_id, COUNT(*)::int AS count
       FROM students WHERE status = 'active'
       GROUP BY class_id, section_id`
    );
    return rows;
  },
};

module.exports = Student;
