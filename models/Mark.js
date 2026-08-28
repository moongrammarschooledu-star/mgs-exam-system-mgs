const db = require('../config/db');

const Mark = {
  async findByExamSubject(examId, subjectId) {
    const { rows } = await db.query(
      `SELECT m.*, s.full_name AS student_name, s.roll_number
       FROM exam_marks m
       JOIN students s ON s.id = m.student_id
       WHERE m.exam_id = $1 AND m.subject_id = $2
       ORDER BY s.roll_number, s.full_name`,
      [examId, subjectId]
    );
    return rows;
  },

  async findByStudentExam(studentId, examId) {
    const { rows } = await db.query(
      `SELECT m.*, sub.name AS subject_name, sub.code AS subject_code,
              es.total_marks, es.passing_marks
       FROM exam_marks m
       JOIN subjects sub ON sub.id = m.subject_id
       LEFT JOIN exam_schedule es ON es.exam_id = m.exam_id AND es.subject_id = m.subject_id
       WHERE m.student_id = $1 AND m.exam_id = $2
       ORDER BY sub.name`,
      [studentId, examId]
    );
    return rows;
  },

  async upsert(examId, subjectId, studentId, marksObtained, isAbsent, enteredBy) {
    const { rows } = await db.query(
      `INSERT INTO exam_marks (exam_id, subject_id, student_id, marks_obtained, is_absent, entered_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (exam_id, subject_id, student_id)
       DO UPDATE SET marks_obtained = EXCLUDED.marks_obtained, is_absent = EXCLUDED.is_absent, entered_by = EXCLUDED.entered_by
       RETURNING *`,
      [examId, subjectId, studentId, isAbsent ? null : marksObtained, !!isAbsent, enteredBy || null]
    );
    return rows[0];
  },

  async bulkUpsert(examId, subjectId, entries, enteredBy) {
    const results = [];
    for (const e of entries) {
      results.push(await Mark.upsert(examId, subjectId, e.studentId, e.marksObtained, e.isAbsent, enteredBy));
    }
    return results;
  },
};

module.exports = Mark;
