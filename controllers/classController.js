const Class = require('../models/Class');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const { asyncHandler } = require('../middleware/errorHandler');

exports.list = asyncHandler(async (req, res) => {
  res.json(await Class.findAll());
});

exports.create = asyncHandler(async (req, res) => {
  const { name, sortOrder } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  res.status(201).json(await Class.create({ name, sortOrder }));
});

exports.update = asyncHandler(async (req, res) => {
  const cls = await Class.update(req.params.id, req.body);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  res.json(cls);
});

exports.remove = asyncHandler(async (req, res) => {
  const ok = await Class.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Class not found' });
  res.status(204).send();
});

// --- Nested: sections ---
exports.listSections = asyncHandler(async (req, res) => {
  res.json(await Section.findAll(req.params.id));
});

exports.createSection = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  res.status(201).json(await Section.create({ classId: req.params.id, name }));
});

// --- Nested: subjects ---
exports.listSubjects = asyncHandler(async (req, res) => {
  res.json(await Subject.findAll(req.params.id));
});

exports.linkSubject = asyncHandler(async (req, res) => {
  const { subjectId } = req.body;
  if (!subjectId) return res.status(400).json({ error: 'subjectId is required' });
  const link = await Subject.linkToClass(req.params.id, subjectId);
  res.status(201).json(link || { message: 'Already linked' });
});

exports.unlinkSubject = asyncHandler(async (req, res) => {
  const ok = await Subject.unlinkFromClass(req.params.id, req.params.subjectId);
  if (!ok) return res.status(404).json({ error: 'Link not found' });
  res.status(204).send();
});
