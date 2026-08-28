const AcademicSession = require('../models/AcademicSession');
const { asyncHandler } = require('../middleware/errorHandler');

exports.list = asyncHandler(async (req, res) => {
  res.json(await AcademicSession.findAll());
});

exports.getCurrent = asyncHandler(async (req, res) => {
  const session = await AcademicSession.findCurrent();
  if (!session) return res.status(404).json({ error: 'No current academic session set' });
  res.json(session);
});

exports.create = asyncHandler(async (req, res) => {
  const { name, startDate, endDate, isCurrent } = req.body;
  if (!name || !startDate || !endDate) {
    return res.status(400).json({ error: 'name, startDate and endDate are required' });
  }
  const session = await AcademicSession.create({ name, startDate, endDate, isCurrent });
  res.status(201).json(session);
});

exports.update = asyncHandler(async (req, res) => {
  const session = await AcademicSession.update(req.params.id, req.body);
  if (!session) return res.status(404).json({ error: 'Academic session not found' });
  res.json(session);
});

exports.remove = asyncHandler(async (req, res) => {
  const ok = await AcademicSession.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Academic session not found' });
  res.status(204).send();
});
