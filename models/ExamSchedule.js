const db = require('../config/db');

const ExamSchedule = {
  async findByExam(examId) {
    const { rows } = await db.query(
      `SELECT sc.*, sub.name AS subject_name, sub.code AS subject_code
       FROM exam_schedule sc
       JOIN subjects sub ON sub.id = sc.subject_id
       WHERE sc.exam_id = $1
       ORDER BY sc.exam_date, sc.start_time`,
      [examId]
    );
    return rows;
  },

  async create({ examId, subjectId, examDate, startTime, endTime, durationMins, totalMarks, passingMarks, room }) {
    const { rows } = await db.query(
      `INSERT INTO exam_schedule
         (exam_id, subject_id, exam_date, start_time, end_time, duration_mins, total_marks, passing_marks, room)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 100), COALESCE($8, 33), $9)
       RETURNING *`,
      [examId, subjectId, examDate, startTime, endTime, durationMins, totalMarks, passingMarks, room || null]
    );
    return rows[0];
  },

  async update(id, fields) {
    const map = {
      examDate: 'exam_date', startTime: 'start_time', endTime: 'end_time',
      durationMins: 'duration_mins', totalMarks: 'total_marks', passingMarks: 'passing_marks', room: 'room',
    };
    const sets = [];
    const params = [id];
    for (const [key, column] of Object.entries(map)) {
      if (fields[key] !== undefined) {
        params.push(fields[key]);
        sets.push(`${column} = $${params.length}`);
      }
    }
    if (sets.length === 0) return null;
    const { rows } = await db.query(
      `UPDATE exam_schedule SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );
    return rows[0] || null;
  },

  async remove(id) {
    const { rowCount } = await db.query('DELETE FROM exam_schedule WHERE id = $1', [id]);
    return rowCount > 0;
  },
};

module.exports = ExamSchedule;
