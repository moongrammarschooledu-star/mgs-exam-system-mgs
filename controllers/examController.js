const Exam = require('../models/Exam');
const ExamSchedule = require('../models/ExamSchedule');
const { asyncHandler } = require('../middleware/errorHandler');

exports.list = asyncHandler(async (req, res) => {
  await Exam.refreshStatuses();
  const { sessionId, classId, status } = req.query;
  res.json(await Exam.findAll({ sessionId, classId, status }));
});

exports.get = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  const schedule = await ExamSchedule.findByExam(exam.id);
  res.json({ ...exam, schedule });
});

exports.create = asyncHandler(async (req, res) => {
  const { name, examType, sessionId, classId, sectionId, startDate, endDate } = req.body;
  if (!name || !sessionId || !classId || !startDate || !endDate) {
    return res.status(400).json({ error: 'name, sessionId, classId, startDate and endDate are required' });
  }
  const exam = await Exam.create({
    name, examType, sessionId, classId, sectionId, startDate, endDate,
    createdBy: req.user && req.user.id,
  });
  res.status(201).json(exam);
});

exports.update = asyncHandler(async (req, res) => {
  const exam = await Exam.update(req.params.id, req.body);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  res.json(exam);
});

exports.remove = asyncHandler(async (req, res) => {
  const ok = await Exam.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Exam not found' });
  res.status(204).send();
});

// --- Date sheet / schedule ---
exports.listSchedule = asyncHandler(async (req, res) => {
  res.json(await ExamSchedule.findByExam(req.params.id));
});

exports.addSchedule = asyncHandler(async (req, res) => {
  const { subjectId, examDate, startTime, endTime, durationMins, totalMarks, passingMarks, room } = req.body;
  if (!subjectId || !examDate || !startTime || !endTime || !durationMins) {
    return res.status(400).json({
      error: 'subjectId, examDate, startTime, endTime and durationMins are required',
    });
  }
  const entry = await ExamSchedule.create({
    examId: req.params.id, subjectId, examDate, startTime, endTime,
    durationMins, totalMarks, passingMarks, room,
  });
  res.status(201).json(entry);
});

exports.updateSchedule = asyncHandler(async (req, res) => {
  const entry = await ExamSchedule.update(req.params.scheduleId, req.body);
  if (!entry) return res.status(404).json({ error: 'Schedule entry not found' });
  res.json(entry);
});

exports.removeSchedule = asyncHandler(async (req, res) => {
  const ok = await ExamSchedule.remove(req.params.scheduleId);
  if (!ok) return res.status(404).json({ error: 'Schedule entry not found' });
  res.status(204).send();
});
