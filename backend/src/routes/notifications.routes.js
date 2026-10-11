const express = require('express');
const notificationsController = require('../controllers/notifications.controller');
const authenticate = require('../middleware/authenticate');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.use(authenticate);

router.get('/', asyncHandler(notificationsController.list));
router.patch('/read-all', asyncHandler(notificationsController.markAllRead)); // MUST come before /:id/read
router.patch('/:id/read', asyncHandler(notificationsController.markRead));

module.exports = router;
