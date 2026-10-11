const express = require('express');
const itemsController = require('../controllers/items.controller');
const authenticate = require('../middleware/authenticate');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Every route below requires login
router.use(authenticate);

router.get('/', asyncHandler(itemsController.list));
router.get('/mine', asyncHandler(itemsController.listMine)); // MUST come before /:id
router.get('/:id', asyncHandler(itemsController.getById));
router.post('/', asyncHandler(itemsController.create));
router.patch('/:id', asyncHandler(itemsController.update));
router.delete('/:id', asyncHandler(itemsController.remove));

module.exports = router;
