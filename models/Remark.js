const db = require('../config/db');

const Remark = {
  async findByStudentExam(studentId, examId) {
    const { rows } = await db.query(
      'SELECT * FROM student_remarks WHERE student_id = $1 AND exam_id = $2',
      [studentId, examId]
    );
    return rows[0] || null;
  },

  async upsert(examId, studentId, teacherRemark, principalRemark) {
    const { rows } = await db.query(
      `INSERT INTO student_remarks (exam_id, student_id, teacher_remark, principal_remark)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (exam_id, student_id)
       DO UPDATE SET teacher_remark = COALESCE(EXCLUDED.teacher_remark, student_remarks.teacher_remark),
                     principal_remark = COALESCE(EXCLUDED.principal_remark, student_remarks.principal_remark)
       RETURNING *`,
      [examId, studentId, teacherRemark || null, principalRemark || null]
    );
    return rows[0];
  },
};

module.exports = Remark;
