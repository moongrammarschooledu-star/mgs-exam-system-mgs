const Mark = require('../models/Mark');
const { asyncHandler } = require('../middleware/errorHandler');

exports.list = asyncHandler(async (req, res) => {
  const { examId, subjectId } = req.params;
  const rows = await Mark.findByExamSubject(examId, subjectId);
  res.json(rows);
});

exports.bulkUpsert = asyncHandler(async (req, res) => {
  const { examId, subjectId } = req.params;
  const { entries } = req.body; // [{ studentId, marksObtained, isAbsent }]
  if (!Array.isArray(entries)) return res.status(400).json({ error: 'entries array required' });
  const rows = await Mark.bulkUpsert(examId, subjectId, entries, req.user.id);
  res.json(rows);
});

exports.studentMarks = asyncHandler(async (req, res) => {
  const { examId, studentId } = req.params;
  const rows = await Mark.findByStudentExam(studentId, examId);
  res.json(rows);
});
