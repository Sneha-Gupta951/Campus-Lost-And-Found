const express = require('express');
const claimsController = require('../controllers/claims.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const asyncHandler = require('../utils/asyncHandler');

// mergeParams lets this router read :id from the parent route (/items/:id/claims)
const router = express.Router({ mergeParams: true });

router.use(authenticate);

// POST /items/:id/claims   GET /items/:id/claims
router.post('/', asyncHandler(claimsController.create));
router.get('/', asyncHandler(claimsController.listForItem));

module.exports = router;

// Separate router for PATCH /claims/:id (not nested under an item id)
const reviewRouter = express.Router();
reviewRouter.patch(
  '/:id',
  authenticate,
  authorize(['security', 'admin']),
  asyncHandler(claimsController.review)
);
module.exports.reviewRouter = reviewRouter;
