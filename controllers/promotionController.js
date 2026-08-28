const Promotion = require('../models/Promotion');
const { asyncHandler } = require('../middleware/errorHandler');

exports.list = asyncHandler(async (req, res) => {
  const { toSessionId } = req.query;
  const rows = await Promotion.all({ toSessionId });
  res.json(rows);
});

exports.historyByStudent = asyncHandler(async (req, res) => {
  const rows = await Promotion.historyByStudent(req.params.studentId);
  res.json(rows);
});

exports.promote = asyncHandler(async (req, res) => {
  const row = await Promotion.promote(req.body);
  res.status(201).json(row);
});

exports.bulkPromote = asyncHandler(async (req, res) => {
  const { entries } = req.body;
  if (!Array.isArray(entries)) return res.status(400).json({ error: 'entries array required' });
  const rows = await Promotion.bulkPromote(entries);
  res.status(201).json(rows);
});
