const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/examController');
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

module.exports = router;
