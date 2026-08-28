const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/classController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.list);
router.post('/', requireAuth, requireRole('admin', 'principal'), ctrl.create);
router.put('/:id', requireAuth, requireRole('admin', 'principal'), ctrl.update);
router.delete('/:id', requireAuth, requireRole('admin', 'principal'), ctrl.remove);

router.get('/:id/sections', requireAuth, ctrl.listSections);
router.post('/:id/sections', requireAuth, requireRole('admin', 'principal'), ctrl.createSection);

router.get('/:id/subjects', requireAuth, ctrl.listSubjects);
router.post('/:id/subjects', requireAuth, requireRole('admin', 'principal'), ctrl.linkSubject);
router.delete('/:id/subjects/:subjectId', requireAuth, requireRole('admin', 'principal'), ctrl.unlinkSubject);

module.exports = router;
