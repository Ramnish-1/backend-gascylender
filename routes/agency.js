const express = require('express');
const router = express.Router();
const controller = require('../controllers/agencyController');
const { authenticate } = require('../middleware/auth');

// Public confirmation link (email) - MUST be before /:id route
router.get('/confirm', controller.confirm);

// Public endpoint to get only active agencies
router.get('/active', controller.listActive);

// Admin-protected CRUD
router.post('/', authenticate, controller.create);
router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, controller.getById);
router.put('/:id', authenticate, controller.update);
router.put('/:id/status', authenticate, controller.updateStatus);
router.delete('/:id', authenticate, controller.remove);

module.exports = router;


