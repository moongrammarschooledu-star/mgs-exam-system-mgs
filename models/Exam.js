const db = require('../config/db');

const BASE_SELECT = `
  SELECT e.*, c.name AS class_name, sec.name AS section_name,
         ses.name AS session_name,
         (SELECT COUNT(*)::int FROM exam_schedule sc WHERE sc.exam_id = e.id) AS paper_count
  FROM exams e
  JOIN classes c ON c.id = e.class_id
  LEFT JOIN sections sec ON sec.id = e.section_id
  JOIN academic_sessions ses ON ses.id = e.session_id
`;

const Exam = {
  async findAll({ sessionId, classId, status } = {}) {
    const clauses = [];
    const params = [];
    if (sessionId) { params.push(sessionId); clauses.push(`e.session_id = $${params.length}`); }
    if (classId) { params.push(classId); clauses.push(`e.class_id = $${params.length}`); }
    if (status) { params.push(status); clauses.push(`e.status = $${params.length}`); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const { rows } = await db.query(`${BASE_SELECT} ${where} ORDER BY e.start_date DESC`, params);
    return rows;
  },

  async findById(id) {
    const { rows } = await db.query(`${BASE_SELECT} WHERE e.id = $1`, [id]);
    return rows[0] || null;
  },

  async create({ name, examType, sessionId, classId, sectionId, startDate, endDate, createdBy }) {
    const { rows } = await db.query(
      `INSERT INTO exams (name, exam_type, session_id, class_id, section_id, start_date, end_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, examType || 'term', sessionId, classId, sectionId || null, startDate, endDate, createdBy || null]
    );
    return rows[0];
  },

  async update(id, fields) {
    const map = {
      name: 'name', examType: 'exam_type', sessionId: 'session_id', classId: 'class_id',
      sectionId: 'section_id', startDate: 'start_date', endDate: 'end_date', status: 'status',
    };
    const sets = [];
    const params = [id];
    for (const [key, column] of Object.entries(map)) {
      if (fields[key] !== undefined) {
        params.push(fields[key]);
        sets.push(`${column} = $${params.length}`);
      }
    }
    if (sets.length === 0) return Exam.findById(id);
    const { rows } = await db.query(
      `UPDATE exams SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );
    return rows[0] || null;
  },

  async remove(id) {
    const { rowCount } = await db.query('DELETE FROM exams WHERE id = $1', [id]);
    return rowCount > 0;
  },

  /** Flips upcoming -> running -> completed based on today's date. Call on dashboard load / a cron. */
  async refreshStatuses() {
    await db.query(`
      UPDATE exams SET status = 'running'
      WHERE status = 'upcoming' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE
    `);
    await db.query(`
      UPDATE exams SET status = 'completed'
      WHERE status IN ('upcoming', 'running') AND end_date < CURRENT_DATE
    `);
  },

  async dashboardStats() {
    await Exam.refreshStatuses();
    const { rows } = await db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM exams) AS total_exams,
        (SELECT COUNT(*)::int FROM exams WHERE status = 'upcoming') AS upcoming_exams,
        (SELECT COUNT(*)::int FROM exams WHERE status = 'running') AS running_exams,
        (SELECT COUNT(*)::int FROM exams WHERE status = 'completed') AS completed_exams,
        (SELECT COUNT(*)::int FROM classes) AS total_classes,
        (SELECT COUNT(*)::int FROM subjects) AS total_subjects,
        (SELECT COUNT(*)::int FROM students WHERE status = 'active') AS total_students
    `);
    return rows[0];
  },

  async upcomingList(limit = 5) {
    const { rows } = await db.query(
      `${BASE_SELECT} WHERE e.status IN ('upcoming', 'running') ORDER BY e.start_date ASC LIMIT $1`,
      [limit]
    );
    return rows;
  },
};

module.exports = Exam;
