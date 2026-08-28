const db = require('../config/db');
const Setting = require('./Setting');

async function getGradeScale() {
  const raw = await Setting.get('grade_scale');
  try {
    return JSON.parse(raw);
  } catch {
    return [{ min: 0, grade: 'F' }];
  }
}

function gradeFor(scale, percentage) {
  for (const band of scale) {
    if (percentage >= band.min) return band.grade;
  }
  return scale.length ? scale[scale.length - 1].grade : '-';
}

const Result = {
  gradeFor,
  getGradeScale,

  // Students who belong to an exam's class (and section if set)
  async studentsForExam(examId) {
    const { rows: examRows } = await db.query('SELECT * FROM exams WHERE id = $1', [examId]);
    const exam = examRows[0];
    if (!exam) return { exam: null, students: [] };
    const params = [exam.class_id];
    let where = 'class_id = $1';
    if (exam.section_id) { params.push(exam.section_id); where += ' AND section_id = $2'; }
    const { rows: students } = await db.query(
      `SELECT * FROM students WHERE ${where} AND status = 'active' ORDER BY roll_number, full_name`,
      params
    );
    return { exam, students };
  },

  // Full per-subject + total result for one student in one exam
  async studentResult(examId, studentId) {
    const { rows } = await db.query(
      `SELECT m.subject_id, sub.name AS subject_name, sub.code AS subject_code,
              m.marks_obtained, m.is_absent,
              COALESCE(es.total_marks, 100) AS total_marks,
              COALESCE(es.passing_marks, 33) AS passing_marks
       FROM exam_schedule es
       JOIN subjects sub ON sub.id = es.subject_id
       LEFT JOIN exam_marks m ON m.exam_id = es.exam_id AND m.subject_id = es.subject_id AND m.student_id = $2
       WHERE es.exam_id = $1
       ORDER BY sub.name`,
      [examId, studentId]
    );

    const scale = await getGradeScale();
    let obtainedTotal = 0;
    let maxTotal = 0;
    let anyFail = false;
    let anyMissing = false;

    const subjects = rows.map((r) => {
      const total = Number(r.total_marks);
      maxTotal += total;
      const obtained = r.is_absent || r.marks_obtained === null ? 0 : Number(r.marks_obtained);
      if (!r.is_absent && r.marks_obtained !== null) obtainedTotal += obtained;
      else anyMissing = true;
      const pass = !r.is_absent && r.marks_obtained !== null && obtained >= Number(r.passing_marks);
      if (!pass) anyFail = true;
      const pct = total ? (obtained / total) * 100 : 0;
      return {
        subjectId: r.subject_id,
        subjectName: r.subject_name,
        subjectCode: r.subject_code,
        marksObtained: r.is_absent ? null : (r.marks_obtained === null ? null : obtained),
        isAbsent: r.is_absent,
        totalMarks: total,
        passingMarks: Number(r.passing_marks),
        grade: r.is_absent || r.marks_obtained === null ? '-' : gradeFor(scale, pct),
        pass,
      };
    });

    const percentage = maxTotal ? (obtainedTotal / maxTotal) * 100 : 0;

    const { rows: remarkRows } = await db.query(
      'SELECT teacher_remark, principal_remark FROM student_remarks WHERE exam_id = $1 AND student_id = $2',
      [examId, studentId]
    );

    return {
      subjects,
      obtainedTotal,
      maxTotal,
      percentage: Math.round(percentage * 100) / 100,
      grade: gradeFor(scale, percentage),
      passFail: anyFail || anyMissing ? 'fail' : 'pass',
      remarks: remarkRows[0] || { teacher_remark: null, principal_remark: null },
    };
  },

  // All students' results for an exam, with position computed by rank of percentage
  async examResults(examId) {
    const { exam, students } = await Result.studentsForExam(examId);
    if (!exam) return { exam: null, results: [] };

    const results = [];
    for (const s of students) {
      const r = await Result.studentResult(examId, s.id);
      results.push({
        studentId: s.id,
        admissionNo: s.admission_no,
        fullName: s.full_name,
        rollNumber: s.roll_number,
        ...r,
      });
    }

    // Rank by percentage desc among pass students; fail students unranked
    const ranked = results
      .filter((r) => r.passFail === 'pass')
      .sort((a, b) => b.percentage - a.percentage);
    ranked.forEach((r, i) => { r.position = i + 1; });
    results.forEach((r) => { if (r.position === undefined) r.position = null; });

    return { exam, results: results.sort((a, b) => (a.position || 999999) - (b.position || 999999) || a.fullName.localeCompare(b.fullName)) };
  },

  // Class/section/school-wide gazette summary for an exam
  async gazette(examId) {
    const { exam, results } = await Result.examResults(examId);
    if (!exam) return null;

    const total = results.length;
    const passCount = results.filter((r) => r.passFail === 'pass').length;
    const failCount = total - passCount;
    const passPercentage = total ? Math.round((passCount / total) * 10000) / 100 : 0;

    const topPositions = results.filter((r) => r.position && r.position <= 3);

    // Subject toppers: highest scorer per subject
    const subjectMap = {};
    results.forEach((r) => {
      r.subjects.forEach((s) => {
        if (s.marksObtained === null) return;
        if (!subjectMap[s.subjectId] || s.marksObtained > subjectMap[s.subjectId].marksObtained) {
          subjectMap[s.subjectId] = {
            subjectId: s.subjectId,
            subjectName: s.subjectName,
            studentName: r.fullName,
            marksObtained: s.marksObtained,
            totalMarks: s.totalMarks,
          };
        }
      });
    });

    return {
      exam,
      totalStudents: total,
      passCount,
      failCount,
      passPercentage,
      topPositions,
      subjectToppers: Object.values(subjectMap),
    };
  },
};

module.exports = Result;
