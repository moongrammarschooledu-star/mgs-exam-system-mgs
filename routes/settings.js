const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/settingController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.all);
router.put('/:key', requireAuth, requireRole('admin', 'principal'), ctrl.set);

module.exports = router;
