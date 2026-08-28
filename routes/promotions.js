const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/promotionController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.list);
router.get('/student/:studentId', requireAuth, ctrl.historyByStudent);
router.post('/', requireAuth, requireRole('admin', 'principal'), ctrl.promote);
router.post('/bulk', requireAuth, requireRole('admin', 'principal'), ctrl.bulkPromote);

module.exports = router;
