const Setting = require('../models/Setting');
const { asyncHandler } = require('../middleware/errorHandler');

exports.all = asyncHandler(async (req, res) => {
  const settings = await Setting.all();
  res.json(settings);
});

exports.set = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  const row = await Setting.set(key, value);
  res.json(row);
});
