const Subject = require('../models/Subject');
const { asyncHandler } = require('../middleware/errorHandler');

exports.list = asyncHandler(async (req, res) => {
  res.json(await Subject.findAll(req.query.classId));
});

exports.create = asyncHandler(async (req, res) => {
  const { name, code } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  res.status(201).json(await Subject.create({ name, code }));
});

exports.update = asyncHandler(async (req, res) => {
  const subject = await Subject.update(req.params.id, req.body);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });
  res.json(subject);
});

exports.remove = asyncHandler(async (req, res) => {
  const ok = await Subject.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Subject not found' });
  res.status(204).send();
});
