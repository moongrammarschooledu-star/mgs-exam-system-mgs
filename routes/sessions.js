const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/sessionController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.list);
router.get('/current', requireAuth, ctrl.getCurrent);
router.post('/', requireAuth, requireRole('admin', 'principal'), ctrl.create);
router.put('/:id', requireAuth, requireRole('admin', 'principal'), ctrl.update);
router.delete('/:id', requireAuth, requireRole('admin', 'principal'), ctrl.remove);

module.exports = router;
