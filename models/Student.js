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
       ORDER BY c.sort_order NULLS LAST, sec.name NULLS LAST,
         (CASE WHEN s.admission_no ~ '^[0-9]+$' THEN s.admission_no::int END) NULLS LAST,
         s.admission_no, s.full_name`,
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

  // Only columns whose keys are actually present in `fields` are updated —
  // this lets a field be explicitly cleared (e.g. sectionId: null) without
  // COALESCE silently keeping the old value, while omitted keys are left
  // untouched.
  async update(id, fields) {
    const COLUMN_BY_KEY = {
      admissionNo: 'admission_no',
      fullName: 'full_name',
      rollNumber: 'roll_number',
      classId: 'class_id',
      sectionId: 'section_id',
      photoUrl: 'photo_url',
      guardianName: 'guardian_name',
      status: 'status',
    };
    const sets = [];
    const params = [id];
    for (const [key, column] of Object.entries(COLUMN_BY_KEY)) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) {
        params.push(fields[key]);
        sets.push(`${column} = $${params.length}`);
      }
    }
    if (!sets.length) return Student.findById(id);
    sets.push('updated_at = now()');
    const { rows } = await db.query(
      `UPDATE students SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      params
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
