const QuestionPaper = require('../models/QuestionPaper');
const { asyncHandler } = require('../middleware/errorHandler');

exports.listByExam = asyncHandler(async (req, res) => {
  const papers = await QuestionPaper.findByExam(req.params.examId);
  res.json(papers);
});

exports.create = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const { subjectId, version, title, instructions, totalMarks } = req.body;
  if (!subjectId || !title) return res.status(400).json({ error: 'subjectId and title are required' });
  const paper = await QuestionPaper.create({
    examId, subjectId, version, title, instructions, totalMarks, createdBy: req.user.id,
  });
  res.status(201).json(paper);
});

exports.remove = asyncHandler(async (req, res) => {
  const ok = await QuestionPaper.remove(req.params.paperId);
  if (!ok) return res.status(404).json({ error: 'Paper not found' });
  res.status(204).send();
});

exports.listQuestions = asyncHandler(async (req, res) => {
  const questions = await QuestionPaper.listQuestions(req.params.paperId);
  res.json(questions);
});

exports.addQuestion = asyncHandler(async (req, res) => {
  const question = await QuestionPaper.addQuestion(req.params.paperId, req.body);
  res.status(201).json(question);
});

exports.removeQuestion = asyncHandler(async (req, res) => {
  const ok = await QuestionPaper.removeQuestion(req.params.questionId);
  if (!ok) return res.status(404).json({ error: 'Question not found' });
  res.status(204).send();
});
