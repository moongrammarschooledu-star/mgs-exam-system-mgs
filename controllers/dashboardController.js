const Exam = require('../models/Exam');
const { asyncHandler } = require('../middleware/errorHandler');

exports.stats = asyncHandler(async (req, res) => {
  // Must run before the two reads below (not in parallel with them) — both queries
  // depend on exam.status already reflecting today's date.
  await Exam.refreshStatuses();

  const [stats, upcoming] = await Promise.all([
    Exam.dashboardStats(),
    Exam.upcomingList(5),
  ]);
  res.json({ stats, upcomingExams: upcoming });
});
