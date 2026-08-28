const Section = require('../models/Section');
const { asyncHandler } = require('../middleware/errorHandler');

exports.list = asyncHandler(async (req, res) => {
  res.json(await Section.findAll(req.query.classId));
});

exports.update = asyncHandler(async (req, res) => {
  const section = await Section.update(req.params.id, req.body);
  if (!section) return res.status(404).json({ error: 'Section not found' });
  res.json(section);
});

exports.remove = asyncHandler(async (req, res) => {
  const ok = await Section.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Section not found' });
  res.status(204).send();
});
