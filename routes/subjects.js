const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/subjectController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.list);
router.post('/', requireAuth, requireRole('admin', 'principal'), ctrl.create);
router.put('/:id', requireAuth, requireRole('admin', 'principal'), ctrl.update);
router.delete('/:id', requireAuth, requireRole('admin', 'principal'), ctrl.remove);

module.exports = router;
