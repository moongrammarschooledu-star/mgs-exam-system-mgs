const Student = require('../models/Student');
const { asyncHandler } = require('../middleware/errorHandler');

exports.list = asyncHandler(async (req, res) => {
  const { classId, sectionId, status } = req.query;
  const students = await Student.findAll({ classId, sectionId, status });
  res.json(students);
});

exports.get = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json(student);
});

exports.create = asyncHandler(async (req, res) => {
  const { admissionNo, fullName, rollNumber, classId, sectionId, photoUrl, guardianName, status } = req.body;
  if (!admissionNo || !fullName) {
    return res.status(400).json({ error: 'admissionNo and fullName are required' });
  }
  const student = await Student.create({ admissionNo, fullName, rollNumber, classId, sectionId, photoUrl, guardianName, status });
  res.status(201).json(student);
});

exports.update = asyncHandler(async (req, res) => {
  const student = await Student.update(req.params.id, req.body);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json(student);
});

exports.remove = asyncHandler(async (req, res) => {
  const ok = await Student.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Student not found' });
  res.status(204).send();
});
