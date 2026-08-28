const db = require('../config/db');

const Attendance = {
  async findByExamSubject(examId, subjectId) {
    const { rows } = await db.query(
      `SELECT a.*, s.full_name AS student_name, s.roll_number
       FROM exam_attendance a
       JOIN students s ON s.id = a.student_id
       WHERE a.exam_id = $1 AND a.subject_id = $2
       ORDER BY s.roll_number, s.full_name`,
      [examId, subjectId]
    );
    return rows;
  },

  async mark(examId, subjectId, studentId, status, markedBy) {
    const { rows } = await db.query(
      `INSERT INTO exam_attendance (exam_id, subject_id, student_id, status, marked_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (exam_id, subject_id, student_id)
       DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by
       RETURNING *`,
      [examId, subjectId, studentId, status, markedBy || null]
    );
    return rows[0];
  },

  async bulkMark(examId, subjectId, entries, markedBy) {
    const results = [];
    for (const e of entries) {
      results.push(await Attendance.mark(examId, subjectId, e.studentId, e.status, markedBy));
    }
    return results;
  },
};

module.exports = Attendance;
