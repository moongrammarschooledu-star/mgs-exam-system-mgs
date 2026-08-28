const db = require('../config/db');

const Promotion = {
  async promote({ studentId, fromSessionId, toSessionId, fromClassId, toClassId, fromSectionId, toSectionId, status, remarks }) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO promotions (student_id, from_session_id, to_session_id, from_class_id, to_class_id, from_section_id, to_section_id, status, remarks)
         VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'promoted'),$9)
         RETURNING *`,
        [studentId, fromSessionId || null, toSessionId || null, fromClassId || null, toClassId || null, fromSectionId || null, toSectionId || null, status, remarks || null]
      );
      if (status !== 'retained') {
        await client.query(
          `UPDATE students SET class_id = COALESCE($2, class_id), section_id = $3,
                  status = CASE WHEN $4 = 'graduated' THEN 'graduated' ELSE status END
           WHERE id = $1`,
          [studentId, toClassId || null, toSectionId || null, status]
        );
      }
      await client.query('COMMIT');
      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async bulkPromote(entries) {
    const results = [];
    for (const e of entries) {
      results.push(await Promotion.promote(e));
    }
    return results;
  },

  async historyByStudent(studentId) {
    const { rows } = await db.query(
      `SELECT p.*, fc.name AS from_class_name, tc.name AS to_class_name,
              fs.name AS from_session_name, ts.name AS to_session_name
       FROM promotions p
       LEFT JOIN classes fc ON fc.id = p.from_class_id
       LEFT JOIN classes tc ON tc.id = p.to_class_id
       LEFT JOIN academic_sessions fs ON fs.id = p.from_session_id
       LEFT JOIN academic_sessions ts ON ts.id = p.to_session_id
       WHERE p.student_id = $1
       ORDER BY p.created_at DESC`,
      [studentId]
    );
    return rows;
  },

  async all({ toSessionId } = {}) {
    const params = [];
    let where = '';
    if (toSessionId) { params.push(toSessionId); where = 'WHERE p.to_session_id = $1'; }
    const { rows } = await db.query(
      `SELECT p.*, s.full_name AS student_name, s.admission_no
       FROM promotions p
       JOIN students s ON s.id = p.student_id
       ${where}
       ORDER BY p.created_at DESC`,
      params
    );
    return rows;
  },
};

module.exports = Promotion;
