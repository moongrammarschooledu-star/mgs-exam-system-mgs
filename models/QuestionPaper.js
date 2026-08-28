const db = require('../config/db');

const QuestionPaper = {
  async findByExam(examId) {
    const { rows } = await db.query(
      `SELECT p.*, sub.name AS subject_name
       FROM question_papers p
       JOIN subjects sub ON sub.id = p.subject_id
       WHERE p.exam_id = $1
       ORDER BY sub.name, p.version`,
      [examId]
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await db.query('SELECT * FROM question_papers WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async create({ examId, subjectId, version, title, instructions, totalMarks, createdBy }) {
    const { rows } = await db.query(
      `INSERT INTO question_papers (exam_id, subject_id, version, title, instructions, total_marks, created_by)
       VALUES ($1, $2, COALESCE($3, 'A'), $4, $5, COALESCE($6, 100), $7)
       RETURNING *`,
      [examId, subjectId, version, title, instructions || null, totalMarks, createdBy || null]
    );
    return rows[0];
  },

  async remove(id) {
    const { rowCount } = await db.query('DELETE FROM question_papers WHERE id = $1', [id]);
    return rowCount > 0;
  },

  async listQuestions(paperId) {
    const { rows } = await db.query(
      'SELECT * FROM paper_questions WHERE paper_id = $1 ORDER BY sort_order, created_at',
      [paperId]
    );
    return rows;
  },

  async addQuestion(paperId, { questionType, questionText, options, correctAnswer, marks, sortOrder }) {
    const { rows } = await db.query(
      `INSERT INTO paper_questions (paper_id, question_type, question_text, options, correct_answer, marks, sort_order)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 1), COALESCE($7, 0))
       RETURNING *`,
      [paperId, questionType || 'short', questionText, options ? JSON.stringify(options) : null, correctAnswer || null, marks, sortOrder]
    );
    return rows[0];
  },

  async removeQuestion(id) {
    const { rowCount } = await db.query('DELETE FROM paper_questions WHERE id = $1', [id]);
    return rowCount > 0;
  },
};

module.exports = QuestionPaper;
