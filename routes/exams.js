const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/examController');
const attendanceCtrl = require('../controllers/attendanceController');
const markCtrl = require('../controllers/markController');
const paperCtrl = require('../controllers/paperController');
const resultCtrl = require('../controllers/resultController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.list);
router.get('/:id', requireAuth, ctrl.get);
router.post('/', requireAuth, requireRole('admin', 'principal', 'coordinator'), ctrl.create);
router.put('/:id', requireAuth, requireRole('admin', 'principal', 'coordinator'), ctrl.update);
router.delete('/:id', requireAuth, requireRole('admin', 'principal'), ctrl.remove);

router.get('/:id/schedule', requireAuth, ctrl.listSchedule);
router.post('/:id/schedule', requireAuth, requireRole('admin', 'principal', 'coordinator'), ctrl.addSchedule);
router.put('/:id/schedule/:scheduleId', requireAuth, requireRole('admin', 'principal', 'coordinator'), ctrl.updateSchedule);
router.delete('/:id/schedule/:scheduleId', requireAuth, requireRole('admin', 'principal', 'coordinator'), ctrl.removeSchedule);

// Attendance (Phase 6)
router.get('/:examId/attendance/:subjectId', requireAuth, attendanceCtrl.list);
router.post('/:examId/attendance/:subjectId', requireAuth, requireRole('admin', 'principal', 'teacher', 'coordinator'), attendanceCtrl.bulkMark);

// Marks (Phase 7 & 8)
router.get('/:examId/marks/:subjectId', requireAuth, markCtrl.list);
router.post('/:examId/marks/:subjectId', requireAuth, requireRole('admin', 'principal', 'teacher', 'coordinator'), markCtrl.bulkUpsert);
router.get('/:examId/marks/student/:studentId', requireAuth, markCtrl.studentMarks);

// Question papers (Phase 5)
router.get('/:examId/papers', requireAuth, paperCtrl.listByExam);
router.post('/:examId/papers', requireAuth, requireRole('admin', 'principal', 'teacher', 'coordinator'), paperCtrl.create);
router.delete('/:examId/papers/:paperId', requireAuth, requireRole('admin', 'principal', 'coordinator'), paperCtrl.remove);
router.get('/:examId/papers/:paperId/questions', requireAuth, paperCtrl.listQuestions);
router.post('/:examId/papers/:paperId/questions', requireAuth, requireRole('admin', 'principal', 'teacher', 'coordinator'), paperCtrl.addQuestion);
router.delete('/:examId/papers/:paperId/questions/:questionId', requireAuth, requireRole('admin', 'principal', 'teacher', 'coordinator'), paperCtrl.removeQuestion);

// Results, gazette, remarks (Phase 8, 9, 10)
router.get('/:examId/results', requireAuth, resultCtrl.examResults);
router.get('/:examId/results/:studentId', requireAuth, resultCtrl.studentResult);
router.get('/:examId/gazette', requireAuth, resultCtrl.gazette);
router.put('/:examId/remarks/:studentId', requireAuth, requireRole('admin', 'principal', 'teacher', 'coordinator'), resultCtrl.setRemark);

module.exports = router;
