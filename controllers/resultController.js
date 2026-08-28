const Result = require('../models/Result');
const Remark = require('../models/Remark');
const { asyncHandler } = require('../middleware/errorHandler');

exports.examResults = asyncHandler(async (req, res) => {
  const data = await Result.examResults(req.params.examId);
  if (!data.exam) return res.status(404).json({ error: 'Exam not found' });
  res.json(data);
});

exports.studentResult = asyncHandler(async (req, res) => {
  const { examId, studentId } = req.params;
  const result = await Result.studentResult(examId, studentId);
  res.json(result);
});

exports.gazette = asyncHandler(async (req, res) => {
  const data = await Result.gazette(req.params.examId);
  if (!data) return res.status(404).json({ error: 'Exam not found' });
  res.json(data);
});

exports.setRemark = asyncHandler(async (req, res) => {
  const { examId, studentId } = req.params;
  const { teacherRemark, principalRemark } = req.body;
  const remark = await Remark.upsert(examId, studentId, teacherRemark, principalRemark);
  res.json(remark);
});
