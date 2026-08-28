const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/studentController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.list);
router.get('/:id', requireAuth, ctrl.get);
router.post('/', requireAuth, requireRole('admin', 'principal', 'coordinator'), ctrl.create);
router.put('/:id', requireAuth, requireRole('admin', 'principal', 'coordinator'), ctrl.update);
router.delete('/:id', requireAuth, requireRole('admin', 'principal'), ctrl.remove);

module.exports = router;
