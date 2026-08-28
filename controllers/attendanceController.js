const Attendance = require('../models/Attendance');
const { asyncHandler } = require('../middleware/errorHandler');

exports.list = asyncHandler(async (req, res) => {
  const { examId, subjectId } = req.params;
  const rows = await Attendance.findByExamSubject(examId, subjectId);
  res.json(rows);
});

exports.bulkMark = asyncHandler(async (req, res) => {
  const { examId, subjectId } = req.params;
  const { entries } = req.body; // [{ studentId, status }]
  if (!Array.isArray(entries)) return res.status(400).json({ error: 'entries array required' });
  const rows = await Attendance.bulkMark(examId, subjectId, entries, req.user.id);
  res.json(rows);
});
